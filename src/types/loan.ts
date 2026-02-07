export type InterestType = 'simple' | 'compound' | 'flat';

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

  // Interest
  hasInterest: boolean;
  interestRate?: number;
  interestType?: InterestType;
  totalWithInterest?: number;

  // EMI
  emiEnabled?: boolean;
  emiAmount?: number;
  emiCount?: number;

  // Sharing
  sharedWith?: string[];
  isShared?: boolean;
  ownerId?: string;
  ownerEmail?: string;
  originalLoanId?: string;

  createdAt?: any;
  updatedAt?: any;
}

export interface Repayment {
  id: string;
  amount: number;
  date: string;
  note: string;
}
