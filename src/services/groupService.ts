import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calculateGroupShares } from '@/utils/groupBalances';
import type {
  GroupExpense,
  GroupInvite,
  GroupSettlement,
  RecurringGroupBill,
  SharedGroup,
} from '@/types/group';

const groupsRef = collection(db, 'groups');
const invitesRef = collection(db, 'groupInvites');

export const groupService = {
  subscribeToGroups(userId: string, callback: (groups: SharedGroup[]) => void) {
    return onSnapshot(query(groupsRef, where('memberIds', 'array-contains', userId)), (snapshot) => {
      callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as SharedGroup)));
    }, (error) => {
      console.error('GroupService: groups subscription failed', error);
      callback([]);
    });
  },

  subscribeToInvites(userId: string, callback: (invites: GroupInvite[]) => void) {
    return onSnapshot(query(invitesRef, where('inviteeUid', '==', userId)), (snapshot) => {
      callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as GroupInvite))
        .filter((invite) => invite.status === 'pending'));
    }, (error) => {
      console.error('GroupService: invitations subscription failed', error);
      callback([]);
    });
  },

  async createGroup(user: { uid: string; email: string; displayName?: string | null }, data: Pick<SharedGroup, 'name' | 'kind' | 'description' | 'budget' | 'startDate' | 'endDate'>) {
    const owner = {
      uid: user.uid,
      email: user.email.trim().toLowerCase(),
      displayName: user.displayName?.trim() || user.email.split('@')[0],
      role: 'owner' as const,
      joinedAt: Timestamp.now(),
    };
    const result = await addDoc(groupsRef, {
      ...data,
      ownerId: user.uid,
      ownerEmail: owner.email,
      memberIds: [user.uid],
      members: [owner],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return result.id;
  },

  async updateGroup(group: SharedGroup, changes: Partial<Pick<SharedGroup, 'name' | 'kind' | 'description' | 'budget' | 'startDate' | 'endDate'>>) {
    await updateDoc(doc(db, 'groups', group.id), { ...changes, updatedAt: Timestamp.now() });
  },

  async inviteMember(group: SharedGroup, inviterName: string, email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail === group.ownerEmail.toLowerCase() || group.members.some((member) => member.email.toLowerCase() === normalizedEmail)) {
      throw new Error('That person is already a member or the email is invalid.');
    }
    const userSnapshot = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail)));
    if (userSnapshot.empty) throw new Error('That person needs an account before you can invite them.');
    const inviteeUid = userSnapshot.docs[0].id;
    if (group.memberIds.includes(inviteeUid)) throw new Error('That person is already in this group.');
    const existing = await getDocs(query(invitesRef, where('groupId', '==', group.id), where('inviteeUid', '==', inviteeUid)));
    const pending = existing.docs.find((item) => item.data().status === 'pending');
    if (pending) throw new Error('There is already a pending invitation for this person.');
    await setDoc(doc(invitesRef, group.id + '_' + inviteeUid), {
      groupId: group.id,
      groupName: group.name,
      groupKind: group.kind,
      ownerId: group.ownerId,
      ownerName: inviterName,
      inviteeUid,
      inviteeEmail: normalizedEmail,
      status: 'pending',
      createdAt: Timestamp.now(),
    });
  },

  async acceptInvite(invite: GroupInvite, member: { uid: string; email: string; displayName?: string | null }) {
    if (invite.inviteeUid !== member.uid || invite.inviteeEmail !== member.email.trim().toLowerCase()) {
      throw new Error('This invitation belongs to a different account.');
    }
    const groupRef = doc(db, 'groups', invite.groupId);
    const inviteRef = doc(db, 'groupInvites', invite.id);
    const batch = writeBatch(db);
    const groupSnapshot = await getDoc(groupRef);
    const inviteSnapshot = await getDoc(inviteRef);
    if (!groupSnapshot.exists() || !inviteSnapshot.exists() || inviteSnapshot.data().status !== 'pending') {
      throw new Error('This invitation is no longer available.');
    }
    const group = { id: groupSnapshot.id, ...groupSnapshot.data() } as SharedGroup;
    const newMember = {
      uid: member.uid,
      email: member.email.trim().toLowerCase(),
      displayName: member.displayName?.trim() || member.email.split('@')[0],
      role: 'member',
      joinedAt: Timestamp.now(),
    };
    batch.update(groupRef, {
      memberIds: Array.from(new Set([...group.memberIds, member.uid])),
      members: [...group.members.filter((item) => item.uid !== member.uid), newMember],
      updatedAt: Timestamp.now(),
    });
    batch.update(inviteRef, { status: 'accepted', acceptedAt: Timestamp.now() });
    await batch.commit();
  },

  async declineInvite(inviteId: string) {
    await updateDoc(doc(db, 'groupInvites', inviteId), { status: 'declined', respondedAt: Timestamp.now() });
  },

  async revokeInvite(inviteId: string) {
    await updateDoc(doc(db, 'groupInvites', inviteId), { status: 'revoked', respondedAt: Timestamp.now() });
  },

  async removeMember(group: SharedGroup, memberUid: string) {
    if (memberUid === group.ownerId) throw new Error('Transfer group ownership before removing its owner.');
    await updateDoc(doc(db, 'groups', group.id), {
      memberIds: group.memberIds.filter((uid) => uid !== memberUid),
      members: group.members.filter((member) => member.uid !== memberUid),
      updatedAt: Timestamp.now(),
    });
  },

  subscribeToGroupExpenses(groupId: string, callback: (expenses: GroupExpense[]) => void) {
    return onSnapshot(query(collection(db, 'groups', groupId, 'expenses'), where('archived', '==', false)), (snapshot) => {
      callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as GroupExpense)));
    }, (error) => {
      console.error('GroupService: expenses subscription failed', error);
      callback([]);
    });
  },

  async addExpense(groupId: string, expense: Omit<GroupExpense, 'id' | 'createdAt' | 'updatedAt'>) {
    const result = await addDoc(collection(db, 'groups', groupId, 'expenses'), {
      ...expense,
      archived: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return result.id;
  },

  async updateExpense(groupId: string, expense: GroupExpense) {
    const { id, ...data } = expense;
    await updateDoc(doc(db, 'groups', groupId, 'expenses', id), { ...data, updatedAt: Timestamp.now() });
  },

  async deleteExpense(groupId: string, expenseId: string) {
    await deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
  },

  subscribeToSettlements(groupId: string, callback: (settlements: GroupSettlement[]) => void) {
    return onSnapshot(collection(db, 'groups', groupId, 'settlements'), (snapshot) => {
      callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as GroupSettlement))
        .sort((a, b) => b.date.localeCompare(a.date)));
    }, (error) => {
      console.error('GroupService: settlements subscription failed', error);
      callback([]);
    });
  },

  async addSettlement(groupId: string, settlement: Omit<GroupSettlement, 'id' | 'createdAt'>) {
    const result = await addDoc(collection(db, 'groups', groupId, 'settlements'), {
      ...settlement,
      createdAt: Timestamp.now(),
    });
    return result.id;
  },

  async deleteSettlement(groupId: string, settlementId: string) {
    await deleteDoc(doc(db, 'groups', groupId, 'settlements', settlementId));
  },

  subscribeToRecurringBills(groupId: string, callback: (bills: RecurringGroupBill[]) => void) {
    return onSnapshot(collection(db, 'groups', groupId, 'recurringBills'), (snapshot) => {
      callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as RecurringGroupBill))
        .sort((a, b) => a.dueDay - b.dueDay));
    }, (error) => {
      console.error('GroupService: recurring bills subscription failed', error);
      callback([]);
    });
  },

  async addRecurringBill(groupId: string, bill: Omit<RecurringGroupBill, 'id' | 'createdAt' | 'updatedAt'>) {
    const result = await addDoc(collection(db, 'groups', groupId, 'recurringBills'), {
      ...bill,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return result.id;
  },

  async updateRecurringBill(groupId: string, bill: RecurringGroupBill) {
    const { id, ...data } = bill;
    await updateDoc(doc(db, 'groups', groupId, 'recurringBills', id), { ...data, updatedAt: Timestamp.now() });
  },

  async deleteRecurringBill(groupId: string, billId: string) {
    await deleteDoc(doc(db, 'groups', groupId, 'recurringBills', billId));
  },

  async recordRecurringBill(group: SharedGroup, bill: RecurringGroupBill, month: string, createdBy: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Choose a valid month.');
    const ref = doc(db, 'groups', group.id, 'expenses', 'bill-' + bill.id + '-' + month);
    const owed = calculateGroupShares(bill.amount, bill.participants, bill.splitType);
    owed.forEach((participant) => {
      if (participant.uid === bill.paidByUid) participant.paidShare = bill.amount;
    });
    const date = month + '-' + String(Math.min(bill.dueDay, new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate())).padStart(2, '0');
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists()) throw new Error('This bill has already been recorded for that month.');
      transaction.set(ref, {
        description: bill.name,
        amount: bill.amount,
        currency: 'INR',
        date,
        category: bill.category,
        paidByUid: bill.paidByUid,
        paidByName: bill.paidByName,
        createdBy,
        splitType: bill.splitType,
        participants: owed,
        splitInputs: bill.participants,
        recurringBillId: bill.id,
        recurringMonth: month,
        archived: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
  },
};
