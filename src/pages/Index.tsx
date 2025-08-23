
import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { QuickStats } from '@/components/QuickStats';
import { ExpenseForm } from '@/components/ExpenseForm';
import { TransactionList } from '@/components/TransactionList';
import { MonthlyChart } from '@/components/MonthlyChart';
import { CategoryBreakdown } from '@/components/CategoryBreakdown';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'expense' | 'income';
}

const Index = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Load transactions from localStorage on mount
  useEffect(() => {
    const savedTransactions = localStorage.getItem('financeTrackerTransactions');
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
  }, []);

  // Save transactions to localStorage whenever transactions change
  useEffect(() => {
    localStorage.setItem('financeTrackerTransactions', JSON.stringify(transactions));
  }, [transactions]);

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
            <ExpenseForm onAddTransaction={addTransaction} />
            
            {/* Monthly Chart */}
            <MonthlyChart transactions={transactions} selectedDate={selectedDate} />
          </div>
          
          {/* Right Column - Breakdown and Transactions */}
          <div className="space-y-8">
            {/* Category Breakdown */}
            <CategoryBreakdown transactions={transactions} selectedDate={selectedDate} />
            
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
