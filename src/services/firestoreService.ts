
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
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Transaction } from '@/pages/Index';

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
        // Still call callback with empty array to prevent infinite loading
        callback([]);
      }
    );
  },

  // Categories
  async addCategory(userId: string, categoryData: Category) {
    try {
      console.log('FirestoreService: Adding category for user:', userId);
      const userCategoriesRef = collection(db, 'users', userId, 'categories');
      const docRef = await addDoc(userCategoriesRef, categoryData);
      console.log('FirestoreService: Category added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('FirestoreService: Error adding category:', error);
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
        // Still call callback with empty array to prevent issues
        callback([]);
      }
    );
  },
};
