export interface Loan {
  id: string;
  lenderName: string;
  totalAmount: number;
  remainingAmount: number;
  description: string;
  borrowedDate: string;
  dueDate: string;
  status: 'active' | 'paid' | 'overdue';
  repayments: Repayment[];
  createdAt?: any;
  updatedAt?: any;
}

export interface Repayment {
  id: string;
  amount: number;
  date: string;
  note: string;
}
