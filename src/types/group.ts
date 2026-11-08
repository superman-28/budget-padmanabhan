export type GroupKind = 'household' | 'trip';
export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export interface GroupMember {
  uid: string;
  email: string;
  displayName: string;
  role: 'owner' | 'member';
  joinedAt?: unknown;
}

export interface SharedGroup {
  id: string;
  name: string;
  kind: GroupKind;
  description?: string;
  ownerId: string;
  ownerEmail: string;
  memberIds: string[];
  members: GroupMember[];
  budget?: number;
  startDate?: string;
  endDate?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  groupKind: GroupKind;
  ownerId: string;
  ownerName: string;
  inviteeUid: string;
  inviteeEmail: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  createdAt?: unknown;
}

export interface GroupParticipantInput {
  uid: string;
  displayName: string;
  value: number;
}

export interface GroupParticipantShare {
  uid: string;
  displayName: string;
  paidShare: number;
  owedShare: number;
}

export interface GroupExpense {
  id: string;
  description: string;
  amount: number;
  currency: 'INR';
  date: string;
  category: string;
  paidByUid: string;
  paidByName: string;
  createdBy: string;
  splitType: SplitType;
  participants: GroupParticipantShare[];
  splitInputs: GroupParticipantInput[];
  note?: string;
  recurringBillId?: string;
  recurringMonth?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GroupSettlement {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  amount: number;
  date: string;
  note?: string;
  createdBy: string;
  createdAt?: unknown;
}

export interface RecurringGroupBill {
  id: string;
  name: string;
  amount: number;
  currency: 'INR';
  category: string;
  paidByUid: string;
  paidByName: string;
  dueDay: number;
  splitType: SplitType;
  participants: GroupParticipantInput[];
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GroupBalance {
  uid: string;
  displayName: string;
  email: string;
  net: number;
}
