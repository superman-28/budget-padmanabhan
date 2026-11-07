export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  createdAt?: unknown;
}
