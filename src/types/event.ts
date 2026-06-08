export interface TripEvent {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  status: 'active' | 'closed';
  createdAt?: any;
  updatedAt?: any;
}
