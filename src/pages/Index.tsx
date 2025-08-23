
import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { QuickStats } from '@/components/QuickStats';
import { ExpenseForm } from '@/components/ExpenseForm';
import { TransactionList } from '@/components/TransactionList';
import { MonthlyChart } from '@/components/MonthlyChart';
import { CategoryBreakdown } from '@/components/CategoryBreakdown';
import { MonthlyTable } from '@/components/MonthlyTable';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [categories, setCategories] = useState<Category[]>(defaultCategories);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTransactions = localStorage.getItem('financeTrackerTransactions');
    const savedCategories = localStorage.getItem('financeTrackerCategories');
    
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
    
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
  }, []);

  // Save data to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('financeTrackerTransactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('financeTrackerCategories', JSON.stringify(categories));
  }, [categories]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addCategory = (category: Category) => {
    setCategories(prev => [...prev, category]);
  };

  return (
    <div className="min-h-screen bg-background">
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
