import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { QuickStats } from '@/components/QuickStats';
import { ExpenseForm } from '@/components/ExpenseForm';
import { TransactionList } from '@/components/TransactionList';
import { MonthlyChart } from '@/components/MonthlyChart';
import { CategoryBreakdown } from '@/components/CategoryBreakdown';
import { MonthlyTable } from '@/components/MonthlyTable';
import { PaymentModeManager, PaymentMode } from '@/components/PaymentModeManager';
import AuthHeader from '@/components/AuthHeader';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreService } from '@/services/firestoreService';
import { userLinkingService } from '@/services/userLinkingService';
import { eventService } from '@/services/eventService';
import { TripEvent } from '@/types/event';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'expense' | 'income';
  paidBy: string;
  paymentMode?: string;
  eventId?: string;
  eventName?: string;
}

interface Category {
  value: string;
  label: string;
  icon: string;
  color: string;
}

const defaultCategories: Category[] = [];

const Index = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

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

    const unsubscribePaymentModes = firestoreService.subscribeToPaymentModes(
      user.uid,
      (modes) => setPaymentModes(modes)
    );

    const unsubscribeEvents = eventService.subscribeToEvents(user.uid, setEvents);

    return () => {
      unsubscribeTransactions();
      unsubscribeCategories();
      unsubscribePaymentModes();
      unsubscribeEvents();
    };
  }, [user]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;
    try {
      const transactionWithPaidBy = { ...transaction, paidBy: transaction.paidBy || user.email! };
      const transactionId = await firestoreService.addTransaction(user.uid, transactionWithPaidBy);
      await userLinkingService.shareTransactionWithLinkedUsers(
        user.uid, user.email!, { ...transactionWithPaidBy, id: transactionId }
      );
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const updateTransaction = async (transaction: Transaction) => {
    if (!user) return;
    try {
      await firestoreService.updateTransaction(user.uid, transaction);
      await userLinkingService.updateSharedTransaction(user.uid, user.email!, transaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await userLinkingService.deleteSharedTransaction(user.uid, id);
      await firestoreService.deleteTransaction(user.uid, id);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const addCategory = async (category: Category) => {
    if (!user) return;
    try { await firestoreService.addCategory(user.uid, category); } catch (e) { console.error(e); }
  };

  const updateCategory = async (oldValue: string, newCategory: Category) => {
    if (!user) return;
    try { await firestoreService.updateCategory(user.uid, oldValue, newCategory); } catch (e) { console.error(e); }
  };

  const deleteCategory = async (categoryValue: string) => {
    if (!user) return;
    try { await firestoreService.deleteCategory(user.uid, categoryValue); } catch (e) { console.error(e); }
  };

  const addPaymentMode = async (mode: PaymentMode) => {
    if (!user) return;
    try { await firestoreService.addPaymentMode(user.uid, mode); } catch (e) { console.error(e); }
  };

  const updatePaymentMode = async (oldValue: string, mode: PaymentMode) => {
    if (!user) return;
    try { await firestoreService.updatePaymentMode(user.uid, oldValue, mode); } catch (e) { console.error(e); }
  };

  const deletePaymentMode = async (value: string) => {
    if (!user) return;
    try { await firestoreService.deletePaymentMode(user.uid, value); } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <DashboardHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <QuickStats transactions={transactions} selectedDate={selectedDate} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <ExpenseForm 
              onAddTransaction={addTransaction} 
              categories={categories}
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
              paymentModes={paymentModes}
              events={events}
            />

            <PaymentModeManager
              paymentModes={paymentModes}
              onAdd={addPaymentMode}
              onUpdate={updatePaymentMode}
              onDelete={deletePaymentMode}
            />
            
            <MonthlyChart transactions={transactions} selectedDate={selectedDate} />
            
            <MonthlyTable 
              transactions={transactions} 
              selectedDate={selectedDate}
              categories={categories}
              events={events}
              onUpdateTransaction={updateTransaction}
              onDeleteTransaction={deleteTransaction}
            />
          </div>
          
          <div className="space-y-4 sm:space-y-6">
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
