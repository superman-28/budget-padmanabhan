
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot,
  where,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Transaction } from '@/pages/Index';
import type { RecurringBill } from '@/types/recurringBill';

interface Category {
  value: string;
  label: string;
  icon: string;
  color: string;
}

export const firestoreService = {
  // Transactions
  async addTransaction(userId: string, transactionData: Omit<Transaction, 'id'>) {
    try {
      console.log('FirestoreService: Adding transaction for user:', userId);
      const userTransactionsRef = collection(db, 'users', userId, 'transactions');
      const docRef = await addDoc(userTransactionsRef, {
        ...transactionData,
        createdAt: Timestamp.now(),
      });
      console.log('FirestoreService: Transaction added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('FirestoreService: Error adding transaction:', error);
      throw error;
    }
  },

  async updateTransaction(userId: string, transaction: Transaction) {
    try {
      console.log('FirestoreService: Updating transaction:', transaction.id, 'for user:', userId);
      const transactionRef = doc(db, 'users', userId, 'transactions', transaction.id);
      const { id, ...transactionData } = transaction;
      await updateDoc(transactionRef, {
        ...transactionData,
        updatedAt: Timestamp.now(),
      });
      console.log('FirestoreService: Transaction updated successfully');
    } catch (error) {
      console.error('FirestoreService: Error updating transaction:', error);
      throw error;
    }
  },

  async deleteTransaction(userId: string, transactionId: string) {
    try {
      console.log('FirestoreService: Deleting transaction:', transactionId, 'for user:', userId);
      const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
      await deleteDoc(transactionRef);
      console.log('FirestoreService: Transaction deleted successfully');
    } catch (error) {
      console.error('FirestoreService: Error deleting transaction:', error);
      throw error;
    }
  },

  subscribeToTransactions(userId: string, callback: (transactions: Transaction[]) => void) {
    console.log('FirestoreService: Setting up transactions subscription for user:', userId);
    const userTransactionsRef = collection(db, 'users', userId, 'transactions');
    const q = query(userTransactionsRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, 
      (snapshot) => {
        console.log('FirestoreService: Transactions snapshot received, count:', snapshot.size);
        const transactions: Transaction[] = [];
        snapshot.forEach((doc) => {
          transactions.push({
            id: doc.id,
            ...doc.data()
          } as Transaction);
        });
        callback(transactions);
      },
      (error) => {
        console.error('FirestoreService: Error in transactions subscription:', error);
        callback([]);
      }
    );
  },

  // Monthly budget plans
  subscribeToMonthlyBudget(userId: string, monthKey: string, callback: (amount: number | null) => void) {
    const budgetRef = doc(db, 'users', userId, 'monthlyBudgets', monthKey);
    return onSnapshot(
      budgetRef,
      (snapshot) => {
        const amount = snapshot.exists() ? Number(snapshot.data().amount) : null;
        callback(amount !== null && Number.isFinite(amount) ? amount : null);
      },
      (error) => {
        console.error('FirestoreService: Error in monthly budget subscription:', error);
        callback(null);
      }
    );
  },

  async saveMonthlyBudget(userId: string, monthKey: string, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Monthly budget must be greater than zero.');
    }
    const budgetRef = doc(db, 'users', userId, 'monthlyBudgets', monthKey);
    await setDoc(budgetRef, { amount, updatedAt: Timestamp.now() });
  },

  // Categories
  async addCategory(userId: string, categoryData: Category) {
    try {
      console.log('FirestoreService: Adding category for user:', userId);
      const userCategoriesRef = collection(db, 'users', userId, 'categories');
      const docRef = await addDoc(userCategoriesRef, {
        value: categoryData.value,
        label: categoryData.label,
        icon: categoryData.icon,
        color: categoryData.color,
      });
      console.log('FirestoreService: Category added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('FirestoreService: Error adding category:', error);
      throw error;
    }
  },

  async updateCategory(userId: string, oldValue: string, newCategory: Category) {
    try {
      console.log('FirestoreService: Updating category:', oldValue, 'to:', newCategory.value, 'for user:', userId);
      
      // Find the category document by value
      const userCategoriesRef = collection(db, 'users', userId, 'categories');
      const q = query(userCategoriesRef, where('value', '==', oldValue));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const categoryDoc = snapshot.docs[0];
        const categoryRef = doc(db, 'users', userId, 'categories', categoryDoc.id);
        await updateDoc(categoryRef, {
          value: newCategory.value,
          label: newCategory.label,
          icon: newCategory.icon,
          color: newCategory.color,
        });
        
        // Update all transactions that use this category
        if (oldValue !== newCategory.value) {
          const userTransactionsRef = collection(db, 'users', userId, 'transactions');
          const transactionsSnapshot = await getDocs(userTransactionsRef);
          
          const updatePromises = transactionsSnapshot.docs
            .filter(doc => {
              const categoryString = doc.data().category || '';
              return categoryString.split(',').map((c: string) => c.trim()).includes(oldValue);
            })
            .map(doc => {
              const categoryString = doc.data().category || '';
              const categories = categoryString.split(',').map((c: string) => c.trim());
              const updatedCategories = categories.map((c: string) => 
                c === oldValue ? newCategory.value : c
              );
              
              const transactionRef = doc.ref;
              return updateDoc(transactionRef, {
                category: updatedCategories.join(','),
                updatedAt: Timestamp.now(),
              });
            });
          
          await Promise.all(updatePromises);
        }
      }
      
      console.log('FirestoreService: Category updated successfully');
    } catch (error) {
      console.error('FirestoreService: Error updating category:', error);
      throw error;
    }
  },

  async deleteCategory(userId: string, categoryValue: string) {
    try {
      console.log('FirestoreService: Deleting category:', categoryValue, 'for user:', userId);
      
      // Find and delete the category document
      const userCategoriesRef = collection(db, 'users', userId, 'categories');
      const q = query(userCategoriesRef, where('value', '==', categoryValue));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const categoryDoc = snapshot.docs[0];
        await deleteDoc(categoryDoc.ref);
      }
      
      console.log('FirestoreService: Category deleted successfully');
    } catch (error) {
      console.error('FirestoreService: Error deleting category:', error);
      throw error;
    }
  },

  subscribeToCategories(userId: string, callback: (categories: Category[]) => void) {
    console.log('FirestoreService: Setting up categories subscription for user:', userId);
    const userCategoriesRef = collection(db, 'users', userId, 'categories');
    
    return onSnapshot(userCategoriesRef, 
      (snapshot) => {
        console.log('FirestoreService: Categories snapshot received, count:', snapshot.size);
        const categories: Category[] = [];
        snapshot.forEach((doc) => {
          categories.push({
            ...doc.data()
          } as Category);
        });
        callback(categories);
      },
      (error) => {
        console.error('FirestoreService: Error in categories subscription:', error);
        callback([]);
      }
    );
  },

  // Payment Modes
  async addPaymentMode(userId: string, mode: { value: string; label: string; icon: string }) {
    try {
      const ref = collection(db, 'users', userId, 'paymentModes');
      await addDoc(ref, mode);
    } catch (error) {
      console.error('FirestoreService: Error adding payment mode:', error);
      throw error;
    }
  },

  async updatePaymentMode(userId: string, oldValue: string, newMode: { value: string; label: string; icon: string }) {
    try {
      const ref = collection(db, 'users', userId, 'paymentModes');
      const q = query(ref, where('value', '==', oldValue));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, { ...newMode });
      }
    } catch (error) {
      console.error('FirestoreService: Error updating payment mode:', error);
      throw error;
    }
  },

  async deletePaymentMode(userId: string, modeValue: string) {
    try {
      const ref = collection(db, 'users', userId, 'paymentModes');
      const q = query(ref, where('value', '==', modeValue));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
      }
    } catch (error) {
      console.error('FirestoreService: Error deleting payment mode:', error);
      throw error;
    }
  },

  subscribeToPaymentModes(userId: string, callback: (modes: { value: string; label: string; icon: string }[]) => void) {
    const ref = collection(db, 'users', userId, 'paymentModes');
    return onSnapshot(ref,
      (snapshot) => {
        const modes: { value: string; label: string; icon: string }[] = [];
        snapshot.forEach((doc) => {
          modes.push(doc.data() as { value: string; label: string; icon: string });
        });
        callback(modes);
      },
      (error) => {
        console.error('FirestoreService: Error in paymentModes subscription:', error);
        callback([]);
      }
    );
  },
  // Monthly recurring bills
  subscribeToRecurringBills(userId: string, callback: (bills: RecurringBill[]) => void) {
    const ref = collection(db, 'users', userId, 'recurringBills');
    return onSnapshot(ref, (snapshot) => {
      const bills: RecurringBill[] = [];
      snapshot.forEach((item) => bills.push({ id: item.id, ...item.data() } as RecurringBill));
      callback(bills.sort((a, b) => a.dueDay - b.dueDay));
    }, (error) => {
      console.error('FirestoreService: recurring bills subscription error:', error);
      callback([]);
    });
  },

  async addRecurringBill(userId: string, bill: Omit<RecurringBill, 'id' | 'createdAt'>) {
    const ref = collection(db, 'users', userId, 'recurringBills');
    const result = await addDoc(ref, { ...bill, createdAt: Timestamp.now() });
    return result.id;
  },

  async deleteRecurringBill(userId: string, billId: string) {
    await deleteDoc(doc(db, 'users', userId, 'recurringBills', billId));
  },
};
