
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

  // Subscribe to user's data when authenticated
  useEffect(() => {
    if (!user) return;

    const unsubscribeTransactions = firestoreService.subscribeToTransactions(
      user.uid,
      (userTransactions) => {
        setTransactions(userTransactions);
        setLoading(false);
      }
    );

    const unsubscribeCategories = firestoreService.subscribeToCategories(
      user.uid,
      (userCategories) => {
        if (userCategories.length > 0) {
          setCategories([...defaultCategories, ...userCategories]);
        }
      }
    );

    return () => {
      unsubscribeTransactions();
      unsubscribeCategories();
    };
  }, [user]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;
    
    try {
      await firestoreService.addTransaction(user.uid, transaction);
      // Transaction will be added to state via the real-time listener
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    
    try {
      await firestoreService.deleteTransaction(user.uid, id);
      // Transaction will be removed from state via the real-time listener
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const addCategory = async (category: Category) => {
    if (!user) return;
    
    try {
      await firestoreService.addCategory(user.uid, category);
      // Category will be added to state via the real-time listener
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <DashboardHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />
        
        {/* Quick Stats */}
        <QuickStats transactions={transactions} selectedDate={selectedDate} />
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Forms and Charts */}
          <div className="lg:col-span-2 space-y-8">
            {/* Expense Form */}
            <ExpenseForm 
              onAddTransaction={addTransaction} 
              categories={categories}
              onAddCategory={addCategory}
            />
            
            {/* Monthly Chart */}
            <MonthlyChart transactions={transactions} selectedDate={selectedDate} />
            
            {/* Monthly Table */}
            <MonthlyTable 
              transactions={transactions} 
              selectedDate={selectedDate}
              categories={categories}
            />
          </div>
          
          {/* Right Column - Breakdown and Transactions */}
          <div className="space-y-8">
            {/* Category Breakdown */}
            <CategoryBreakdown 
              transactions={transactions} 
              selectedDate={selectedDate}
              categories={categories}
            />
            
            {/* Recent Transactions */}
            <TransactionList 
              transactions={transactions}
              onDeleteTransaction={deleteTransaction}
              selectedDate={selectedDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
