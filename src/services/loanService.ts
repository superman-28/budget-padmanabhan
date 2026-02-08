import {
  collection,
  doc,
  addDoc,
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
import { Loan, Repayment } from '@/types/loan';

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

// Firestore doesn't accept undefined values — strip them before writing
function stripUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const loanService = {
  // ─── Subscriptions ───────────────────────────────────────

  subscribeToLoans(userId: string, callback: (loans: Loan[]) => void) {
    const loansRef = collection(db, 'users', userId, 'loans');
    const q = query(loansRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const loans: Loan[] = [];
        snapshot.forEach((d) => loans.push({ id: d.id, ...d.data() } as Loan));
        callback(loans);
      },
      (error) => {
        console.error('LoanService: subscription error', error);
        callback([]);
      }
    );
  },

  subscribeToSharedLoans(userId: string, callback: (loans: Loan[]) => void) {
    const ref = collection(db, 'users', userId, 'shared_loans');
    const q = query(ref, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const loans: Loan[] = [];
        snapshot.forEach((d) => loans.push({ id: d.id, ...d.data(), isShared: true } as Loan));
        callback(loans);
      },
      (error) => {
        console.error('LoanService: shared-loans subscription error', error);
        callback([]);
      }
    );
  },

  // ─── CRUD ────────────────────────────────────────────────

  async addLoan(userId: string, loanData: Omit<Loan, 'id' | 'repayments' | 'remainingAmount' | 'status'>) {
    try {
      const effectiveTotal =
        loanData.hasInterest && loanData.totalWithInterest ? loanData.totalWithInterest : loanData.totalAmount;

      const loansRef = collection(db, 'users', userId, 'loans');
      const docRef = await addDoc(loansRef, stripUndefined({
        ...loanData,
        remainingAmount: effectiveTotal,
        status: 'active',
        repayments: [],
        sharedWith: [],
        createdAt: Timestamp.now(),
      }));
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

      // Recalculate remaining from effective total minus total repaid
      const totalRepaid = loan.repayments.reduce((s, r) => s + r.amount, 0);
      const effectiveTotal =
        loan.hasInterest && loan.totalWithInterest ? loan.totalWithInterest : loan.totalAmount;
      const newRemaining = Math.max(0, effectiveTotal - totalRepaid);
      const newStatus = newRemaining <= 0 ? 'paid' : 'active';

      const updateData = stripUndefined({
        ...loanData,
        remainingAmount: newRemaining,
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      await updateDoc(loanRef, updateData);
      await this.syncSharedCopies(userId, loan.id, updateData);
    } catch (error) {
      console.error('LoanService: Error updating loan:', error);
      throw error;
    }
  },

  async deleteLoan(userId: string, loanId: string) {
    try {
      const loanRef = doc(db, 'users', userId, 'loans', loanId);
      await deleteDoc(loanRef);
      // Remove all shared copies
      await this.removeAllSharedCopies(userId, loanId);
    } catch (error) {
      console.error('LoanService: Error deleting loan:', error);
      throw error;
    }
  },

  // ─── Repayments ──────────────────────────────────────────

  async addRepayment(userId: string, loan: Loan, repayment: Omit<Repayment, 'id'>) {
    try {
      const newRepayment: Repayment = { id: generateId(), ...repayment };
      const updatedRepayments = [...loan.repayments, newRepayment];
      const newRemaining = loan.remainingAmount - repayment.amount;
      const newStatus = newRemaining <= 0 ? 'paid' : loan.status;

      const loanRef = doc(db, 'users', userId, 'loans', loan.id);
      const updateData = {
        repayments: updatedRepayments,
        remainingAmount: Math.max(0, newRemaining),
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      await updateDoc(loanRef, updateData);
      await this.syncSharedCopies(userId, loan.id, updateData);
    } catch (error) {
      console.error('LoanService: Error adding repayment:', error);
      throw error;
    }
  },

  async editRepayment(userId: string, loan: Loan, updatedRepayment: Repayment) {
    try {
      const oldRepayment = loan.repayments.find((r) => r.id === updatedRepayment.id);
      if (!oldRepayment) return;

      const updatedRepayments = loan.repayments.map((r) =>
        r.id === updatedRepayment.id ? updatedRepayment : r
      );
      const diff = updatedRepayment.amount - oldRepayment.amount;
      const newRemaining = Math.max(0, loan.remainingAmount - diff);
      const effectiveTotal =
        loan.hasInterest && loan.totalWithInterest ? loan.totalWithInterest : loan.totalAmount;
      const newStatus = newRemaining <= 0 ? 'paid' : newRemaining < effectiveTotal ? 'active' : loan.status;

      const loanRef = doc(db, 'users', userId, 'loans', loan.id);
      const updateData = {
        repayments: updatedRepayments,
        remainingAmount: newRemaining,
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      await updateDoc(loanRef, updateData);
      await this.syncSharedCopies(userId, loan.id, updateData);
    } catch (error) {
      console.error('LoanService: Error editing repayment:', error);
      throw error;
    }
  },

  async deleteRepayment(userId: string, loan: Loan, repaymentId: string) {
    try {
      const repayment = loan.repayments.find((r) => r.id === repaymentId);
      if (!repayment) return;

      const updatedRepayments = loan.repayments.filter((r) => r.id !== repaymentId);
      const newRemaining = loan.remainingAmount + repayment.amount;
      const effectiveTotal =
        loan.hasInterest && loan.totalWithInterest ? loan.totalWithInterest : loan.totalAmount;
      const newStatus = newRemaining > 0 ? 'active' : 'paid';

      const loanRef = doc(db, 'users', userId, 'loans', loan.id);
      const updateData = {
        repayments: updatedRepayments,
        remainingAmount: Math.min(effectiveTotal, newRemaining),
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      await updateDoc(loanRef, updateData);
      await this.syncSharedCopies(userId, loan.id, updateData);
    } catch (error) {
      console.error('LoanService: Error deleting repayment:', error);
      throw error;
    }
  },

  // ─── Sharing ─────────────────────────────────────────────

  async shareLoan(userId: string, userEmail: string, loan: Loan, targetEmail: string) {
    try {
      const normalizedEmail = targetEmail.trim().toLowerCase();
      if (normalizedEmail === userEmail.toLowerCase()) {
        throw new Error('You cannot share a loan with yourself');
      }
      if (loan.sharedWith?.includes(normalizedEmail)) {
        throw new Error('Loan is already shared with this user');
      }

      // Find user by email
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

      // Create shared copy
      const { id, ...loanData } = loan;
      const sharedRef = collection(db, 'users', targetUserId, 'shared_loans');
      const sharedDoc = await addDoc(sharedRef, {
        ...loanData,
        isShared: true,
        ownerId: userId,
        ownerEmail: userEmail,
        originalLoanId: id,
        createdAt: Timestamp.now(),
      });

      // Track the link
      await addDoc(collection(db, 'sharedLoanLinks'), {
        originalLoanId: id,
        sharedLoanDocId: sharedDoc.id,
        ownerId: userId,
        linkedUserId: targetUserId,
        linkedEmail: normalizedEmail,
        createdAt: Timestamp.now(),
      });

      // Update sharedWith on original
      const loanRef = doc(db, 'users', userId, 'loans', id);
      await updateDoc(loanRef, {
        sharedWith: [...(loan.sharedWith || []), normalizedEmail],
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('LoanService: Error sharing loan:', error);
      throw error;
    }
  },

  async unshareLoan(userId: string, loan: Loan, targetEmail: string) {
    try {
      const normalizedEmail = targetEmail.trim().toLowerCase();

      // Find & remove shared copy link
      const linksRef = collection(db, 'sharedLoanLinks');
      const q = query(
        linksRef,
        where('originalLoanId', '==', loan.id),
        where('ownerId', '==', userId),
        where('linkedEmail', '==', normalizedEmail)
      );
      const snapshot = await getDocs(q);

      for (const linkDoc of snapshot.docs) {
        const data = linkDoc.data();
        // Delete the shared loan doc
        try {
          await deleteDoc(doc(db, 'users', data.linkedUserId, 'shared_loans', data.sharedLoanDocId));
        } catch {}
        await deleteDoc(linkDoc.ref);
      }

      // Update sharedWith on original
      const loanRef = doc(db, 'users', userId, 'loans', loan.id);
      await updateDoc(loanRef, {
        sharedWith: (loan.sharedWith || []).filter((e) => e !== normalizedEmail),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('LoanService: Error unsharing loan:', error);
      throw error;
    }
  },

  // ─── Sync helpers ────────────────────────────────────────

  async syncSharedCopies(userId: string, loanId: string, updateData: any) {
    try {
      const linksRef = collection(db, 'sharedLoanLinks');
      const q = query(linksRef, where('originalLoanId', '==', loanId), where('ownerId', '==', userId));
      const snapshot = await getDocs(q);

      for (const linkDoc of snapshot.docs) {
        const data = linkDoc.data();
        try {
          const sharedRef = doc(db, 'users', data.linkedUserId, 'shared_loans', data.sharedLoanDocId);
          await updateDoc(sharedRef, { ...updateData, updatedAt: Timestamp.now() });
        } catch (err) {
          console.error('LoanService: Error syncing shared copy:', err);
        }
      }
    } catch (error) {
      console.error('LoanService: Error syncing shared copies:', error);
    }
  },

  async removeAllSharedCopies(userId: string, loanId: string) {
    try {
      const linksRef = collection(db, 'sharedLoanLinks');
      const q = query(linksRef, where('originalLoanId', '==', loanId), where('ownerId', '==', userId));
      const snapshot = await getDocs(q);

      for (const linkDoc of snapshot.docs) {
        const data = linkDoc.data();
        try {
          await deleteDoc(doc(db, 'users', data.linkedUserId, 'shared_loans', data.sharedLoanDocId));
        } catch {}
        await deleteDoc(linkDoc.ref);
      }
    } catch (error) {
      console.error('LoanService: Error removing shared copies:', error);
    }
  },
};
