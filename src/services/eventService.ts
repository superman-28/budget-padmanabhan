import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TripEvent } from '@/types/event';
import { Transaction } from '@/pages/Index';


function stripUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const eventService = {
  subscribeToEvents(userId: string, callback: (events: TripEvent[]) => void) {
    const ref = collection(db, 'users', userId, 'events');
    const q = query(ref, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const events: TripEvent[] = [];
        snapshot.forEach((d) => events.push({ id: d.id, ...d.data() } as TripEvent));
        callback(events);
      },
      (error) => {
        console.error('EventService: subscription error', error);
        callback([]);
      }
    );
  },

  subscribeToSharedEvents(userId: string, callback: (events: TripEvent[]) => void) {
    const ref = collection(db, 'users', userId, 'shared_events');
    const q = query(ref, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const events: TripEvent[] = [];
        snapshot.forEach((d) => events.push({ id: d.id, ...d.data(), isShared: true } as TripEvent));
        callback(events);
      },
      (error) => {
        console.error('EventService: shared subscription error', error);
        callback([]);
      }
    );
  },

  async addEvent(userId: string, data: Omit<TripEvent, 'id' | 'status' | 'createdAt'>) {
    const ref = collection(db, 'users', userId, 'events');
    const docRef = await addDoc(ref, stripUndefined({
      ...data,
      status: 'active',
      sharedWith: [],
      createdAt: Timestamp.now(),
    }));
    return docRef.id;
  },

  async updateEvent(userId: string, event: TripEvent) {
    const ref = doc(db, 'users', userId, 'events', event.id);
    const { id, ...rest } = event;
    const updateData = stripUndefined({ ...rest, updatedAt: Timestamp.now() });
    await updateDoc(ref, updateData);
    await this.syncSharedCopies(userId, id, updateData);
  },

  async deleteEvent(userId: string, eventId: string) {
    const ref = doc(db, 'users', userId, 'events', eventId);
    await deleteDoc(ref);
    await this.removeAllSharedCopies(userId, eventId);
  },

  // ─── Sharing ─────────────────────────────────────────────

  async shareEvent(userId: string, userEmail: string, event: TripEvent, targetEmail: string) {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    if (normalizedEmail === userEmail.toLowerCase()) {
      throw new Error('You cannot share an event with yourself');
    }
    if (event.sharedWith?.includes(normalizedEmail)) {
      throw new Error('Event is already shared with this user');
    }

    const usersRef = collection(db, 'users');
    let q = query(usersRef, where('email', '==', normalizedEmail));
    let snapshot = await getDocs(q);
    if (snapshot.empty) {
      q = query(usersRef, where('email', '==', targetEmail.trim()));
      snapshot = await getDocs(q);
    }
    if (snapshot.empty) {
      throw new Error(`User not found with email: ${targetEmail}. They must sign up first.`);
    }

    const targetUserId = snapshot.docs[0].id;
    const { id, ...eventData } = event;
    const sharedRef = collection(db, 'users', targetUserId, 'shared_events');
    const sharedDoc = await addDoc(sharedRef, stripUndefined({
      ...eventData,
      isShared: true,
      ownerId: userId,
      ownerEmail: userEmail,
      originalEventId: id,
      createdAt: Timestamp.now(),
    }));

    await addDoc(collection(db, 'sharedEventLinks'), {
      originalEventId: id,
      sharedEventDocId: sharedDoc.id,
      ownerId: userId,
      linkedUserId: targetUserId,
      linkedEmail: normalizedEmail,
      createdAt: Timestamp.now(),
    });

    const eventRef = doc(db, 'users', userId, 'events', id);
    await updateDoc(eventRef, {
      sharedWith: [...(event.sharedWith || []), normalizedEmail],
      updatedAt: Timestamp.now(),
    });

    // Backfill existing transactions linked to this event to the recipient
    try {
      const txnsRef = collection(db, 'users', userId, 'transactions');
      const txnQ = query(txnsRef, where('eventId', '==', id));
      const txnSnap = await getDocs(txnQ);
      for (const t of txnSnap.docs) {
        const targetTxnRef = doc(db, 'users', targetUserId, 'shared_event_transactions', t.id);
        await setDoc(targetTxnRef, stripUndefined({
          ...t.data(),
          originalTxnId: t.id,
          ownerId: userId,
          ownerEmail: userEmail,
          eventId: id,
          syncedAt: Timestamp.now(),
        }));
      }
    } catch (err) {
      console.error('EventService: backfill shared transactions error', err);
    }
  },


  async unshareEvent(userId: string, event: TripEvent, targetEmail: string) {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    const linksRef = collection(db, 'sharedEventLinks');
    const q = query(
      linksRef,
      where('originalEventId', '==', event.id),
      where('ownerId', '==', userId),
      where('linkedEmail', '==', normalizedEmail)
    );
    const snapshot = await getDocs(q);
    for (const linkDoc of snapshot.docs) {
      const data = linkDoc.data();
      try {
        await deleteDoc(doc(db, 'users', data.linkedUserId, 'shared_events', data.sharedEventDocId));
      } catch {}
      await deleteDoc(linkDoc.ref);
    }
    const eventRef = doc(db, 'users', userId, 'events', event.id);
    await updateDoc(eventRef, {
      sharedWith: (event.sharedWith || []).filter((e) => e !== normalizedEmail),
      updatedAt: Timestamp.now(),
    });
  },

  async syncSharedCopies(userId: string, eventId: string, updateData: any) {
    try {
      const linksRef = collection(db, 'sharedEventLinks');
      const q = query(linksRef, where('originalEventId', '==', eventId), where('ownerId', '==', userId));
      const snapshot = await getDocs(q);
      for (const linkDoc of snapshot.docs) {
        const data = linkDoc.data();
        try {
          const sharedRef = doc(db, 'users', data.linkedUserId, 'shared_events', data.sharedEventDocId);
          await updateDoc(sharedRef, { ...updateData, updatedAt: Timestamp.now() });
        } catch (err) {
          console.error('EventService: sync shared copy error', err);
        }
      }
    } catch (e) {
      console.error('EventService: syncSharedCopies error', e);
    }
  },

  async removeAllSharedCopies(userId: string, eventId: string) {
    try {
      const linksRef = collection(db, 'sharedEventLinks');
      const q = query(linksRef, where('originalEventId', '==', eventId), where('ownerId', '==', userId));
      const snapshot = await getDocs(q);
      for (const linkDoc of snapshot.docs) {
        const data = linkDoc.data();
        try {
          await deleteDoc(doc(db, 'users', data.linkedUserId, 'shared_events', data.sharedEventDocId));
        } catch {}
        await deleteDoc(linkDoc.ref);
      }
    } catch (e) {
      console.error('EventService: removeAllSharedCopies error', e);
    }
  },
};
