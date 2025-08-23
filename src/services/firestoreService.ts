
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
    const userTransactionsRef = collection(db, 'users', userId, 'transactions');
    const docRef = await addDoc(userTransactionsRef, {
      ...transactionData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async deleteTransaction(userId: string, transactionId: string) {
    const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
    await deleteDoc(transactionRef);
  },

  subscribeToTransactions(userId: string, callback: (transactions: Transaction[]) => void) {
    const userTransactionsRef = collection(db, 'users', userId, 'transactions');
    const q = query(userTransactionsRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const transactions: Transaction[] = [];
      snapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        } as Transaction);
      });
      callback(transactions);
    });
  },

  // Categories
  async addCategory(userId: string, categoryData: Category) {
    const userCategoriesRef = collection(db, 'users', userId, 'categories');
    const docRef = await addDoc(userCategoriesRef, categoryData);
    return docRef.id;
  },

  subscribeToCategories(userId: string, callback: (categories: Category[]) => void) {
    const userCategoriesRef = collection(db, 'users', userId, 'categories');
    
    return onSnapshot(userCategoriesRef, (snapshot) => {
      const categories: Category[] = [];
      snapshot.forEach((doc) => {
        categories.push({
          ...doc.data()
        } as Category);
      });
      callback(categories);
    });
  },
};
