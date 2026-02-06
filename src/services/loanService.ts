import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loan, Repayment } from '@/types/loan';

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

export const loanService = {
  subscribeToLoans(userId: string, callback: (loans: Loan[]) => void) {
    const loansRef = collection(db, 'users', userId, 'loans');
    const q = query(loansRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const loans: Loan[] = [];
        snapshot.forEach((doc) => {
          loans.push({ id: doc.id, ...doc.data() } as Loan);
        });
        callback(loans);
      },
      (error) => {
        console.error('LoanService: Error in loans subscription:', error);
        callback([]);
      }
    );
  },

  async addLoan(userId: string, loanData: Omit<Loan, 'id' | 'repayments' | 'remainingAmount' | 'status'>) {
    try {
      const loansRef = collection(db, 'users', userId, 'loans');
      const docRef = await addDoc(loansRef, {
        ...loanData,
        remainingAmount: loanData.totalAmount,
        status: 'active',
        repayments: [],
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('LoanService: Error adding loan:', error);
      throw error;
    }
  },

  async updateLoan(userId: string, loan: Loan) {
    try {
      const loanRef = doc(db, 'users', userId, 'loans', loan.id);
      const { id, ...loanData } = loan;
      await updateDoc(loanRef, {
        ...loanData,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('LoanService: Error updating loan:', error);
      throw error;
    }
  },

  async deleteLoan(userId: string, loanId: string) {
    try {
      const loanRef = doc(db, 'users', userId, 'loans', loanId);
      await deleteDoc(loanRef);
    } catch (error) {
      console.error('LoanService: Error deleting loan:', error);
      throw error;
    }
  },

  async addRepayment(userId: string, loan: Loan, repayment: Omit<Repayment, 'id'>) {
    try {
      const newRepayment: Repayment = {
        id: generateId(),
        ...repayment,
      };
      const updatedRepayments = [...loan.repayments, newRepayment];
      const newRemaining = loan.remainingAmount - repayment.amount;
      const newStatus = newRemaining <= 0 ? 'paid' : loan.status;

      const loanRef = doc(db, 'users', userId, 'loans', loan.id);
      await updateDoc(loanRef, {
        repayments: updatedRepayments,
        remainingAmount: Math.max(0, newRemaining),
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('LoanService: Error adding repayment:', error);
      throw error;
    }
  },

  async deleteRepayment(userId: string, loan: Loan, repaymentId: string) {
    try {
      const repayment = loan.repayments.find((r) => r.id === repaymentId);
      if (!repayment) return;

      const updatedRepayments = loan.repayments.filter((r) => r.id !== repaymentId);
      const newRemaining = loan.remainingAmount + repayment.amount;
      const newStatus = newRemaining > 0 ? 'active' : 'paid';

      const loanRef = doc(db, 'users', userId, 'loans', loan.id);
      await updateDoc(loanRef, {
        repayments: updatedRepayments,
        remainingAmount: Math.min(loan.totalAmount, newRemaining),
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('LoanService: Error deleting repayment:', error);
      throw error;
    }
  },
};
