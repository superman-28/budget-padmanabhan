import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { QuickStats } from '@/components/QuickStats';
import { ExpenseForm } from '@/components/ExpenseForm';
import { TransactionList } from '@/components/TransactionList';
import { MonthlyChart } from '@/components/MonthlyChart';
import { CategoryBreakdown } from '@/components/CategoryBreakdown';
import { MonthlyTable } from '@/components/MonthlyTable';
import AuthHeader from '@/components/AuthHeader';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreService } from '@/services/firestoreService';
import { userLinkingService } from '@/services/userLinkingService';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'expense' | 'income';
}

interface Category {
  value: string;
  label: string;
  icon: string;
  color: string;
}

const defaultCategories: Category[] = [
  { value: 'food', label: 'Food & Dining', icon: '🍽️', color: '#eab308' },
  { value: 'transport', label: 'Transportation', icon: '🚗', color: '#3b82f6' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', color: '#ef4444' },
  { value: 'bills', label: 'Bills & Utilities', icon: '📄', color: '#22c55e' },
  { value: 'health', label: 'Healthcare', icon: '🏥', color: '#06b6d4' },
  { value: 'other', label: 'Other', icon: '💼', color: '#6b7280' },
];

const Index = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [loading, setLoading] = useState(true);

  console.log('Index: Component rendering with user:', user?.email);

  // Subscribe to user's data when authenticated
  useEffect(() => {
    if (!user) {
      console.log('Index: No user found in useEffect');
      return;
    }

    console.log('Index: Setting up Firestore subscriptions for user:', user.uid);
    setLoading(true);

    const unsubscribeTransactions = firestoreService.subscribeToTransactions(
      user.uid,
      (userTransactions) => {
        console.log('Index: Received transactions:', userTransactions.length);
        setTransactions(userTransactions);
        setLoading(false);
      }
    );

    const unsubscribeCategories = firestoreService.subscribeToCategories(
      user.uid,
      (userCategories) => {
        console.log('Index: Received categories:', userCategories.length);
        if (userCategories.length > 0) {
          setCategories([...defaultCategories, ...userCategories]);
        }
      }
    );

    return () => {
      console.log('Index: Cleaning up Firestore subscriptions');
      unsubscribeTransactions();
      unsubscribeCategories();
    };
  }, [user]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;
    
    try {
      console.log('Index: Adding transaction');
      await firestoreService.addTransaction(user.uid, transaction);
      
      // Share transaction with linked users
      await userLinkingService.shareTransactionWithLinkedUsers(
        user.uid,
        user.email!,
        transaction
      );
    } catch (error) {
      console.error('Index: Error adding transaction:', error);
    }
  };

  const updateTransaction = async (transaction: Transaction) => {
    if (!user) return;
    
    try {
      console.log('Index: Updating transaction:', transaction.id);
      await firestoreService.updateTransaction(user.uid, transaction);
    } catch (error) {
      console.error('Index: Error updating transaction:', error);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    
    try {
      console.log('Index: Deleting transaction:', id);
      await firestoreService.deleteTransaction(user.uid, id);
    } catch (error) {
      console.error('Index: Error deleting transaction:', error);
    }
  };

  const addCategory = async (category: Category) => {
    if (!user) return;
    
    try {
      console.log('Index: Adding category');
      await firestoreService.addCategory(user.uid, category);
    } catch (error) {
      console.error('Index: Error adding category:', error);
    }
  };

  const updateCategory = async (oldValue: string, newCategory: Category) => {
    if (!user) return;
    
    try {
      console.log('Index: Updating category:', oldValue, 'to:', newCategory.value);
      await firestoreService.updateCategory(user.uid, oldValue, newCategory);
    } catch (error) {
      console.error('Index: Error updating category:', error);
    }
  };

  const deleteCategory = async (categoryValue: string) => {
    if (!user) return;
    
    try {
      console.log('Index: Deleting category:', categoryValue);
      await firestoreService.deleteCategory(user.uid, categoryValue);
    } catch (error) {
      console.error('Index: Error deleting category:', error);
    }
  };

  if (loading) {
    console.log('Index: Showing loading state');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  console.log('Index: Rendering main dashboard');
  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        <DashboardHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <QuickStats transactions={transactions} selectedDate={selectedDate} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <ExpenseForm 
              onAddTransaction={addTransaction} 
              categories={categories}
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
            />
            
            <MonthlyChart transactions={transactions} selectedDate={selectedDate} />
            
            <MonthlyTable 
              transactions={transactions} 
              selectedDate={selectedDate}
              categories={categories}
              onUpdateTransaction={updateTransaction}
              onDeleteTransaction={deleteTransaction}
            />
          </div>
          
          <div className="space-y-8">
            <CategoryBreakdown 
              transactions={transactions} 
              selectedDate={selectedDate}
              categories={categories}
              onDeleteTransaction={deleteTransaction}
            />
            
            <TransactionList 
              transactions={transactions}
              onDeleteTransaction={deleteTransaction}
              selectedDate={selectedDate}
              categories={categories}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
