export interface TripEvent {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  status: 'active' | 'closed';
  sharedWith?: string[];
  isShared?: boolean;
  ownerId?: string;
  ownerEmail?: string;
  originalEventId?: string;
  createdAt?: any;
  updatedAt?: any;
}
