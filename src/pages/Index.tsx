import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { QuickStats } from '@/components/QuickStats';
import { ExpenseForm } from '@/components/ExpenseForm';
import { TransactionList } from '@/components/TransactionList';
import { MonthlyChart } from '@/components/MonthlyChart';
import { CategoryBreakdown } from '@/components/CategoryBreakdown';
import { MonthlyTable } from '@/components/MonthlyTable';
import { PaymentModeManager, PaymentMode } from '@/components/PaymentModeManager';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreService } from '@/services/firestoreService';
import { userLinkingService } from '@/services/userLinkingService';
import { eventService } from '@/services/eventService';
import { TripEvent } from '@/types/event';
import { StatementImport } from '@/components/StatementImport';
import { BankCsvImport } from '@/components/BankCsvImport';
import { RecurringBills } from '@/components/RecurringBills';
import { MonthlyPlan } from '@/components/MonthlyPlan';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'expense' | 'income' | 'transfer';
  paidBy: string;
  paymentMode?: string;
  eventId?: string;
  eventName?: string;
  source?: 'gpay_statement' | 'bank_csv';
  sharing?: 'private' | 'linked';
  sourceTransactionId?: string;
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

  useEffect(() => {
    if (!user?.email) return;
    const sharedEventIds = events.filter((e) => (e.sharedWith || []).length > 0).map((e) => e.id);
    sharedEventIds.forEach((eventId) => {
      eventService.syncEventTransactionsForRecipients(user.uid, user.email!, eventId);
    });
  }, [user, events, transactions]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;
    try {
      const transactionWithPaidBy = { ...transaction, paidBy: transaction.paidBy || user.email! };
      const transactionId = await firestoreService.addTransaction(user.uid, transactionWithPaidBy);
      const fullTxn = { ...transactionWithPaidBy, id: transactionId } as Transaction;
      if (fullTxn.sharing !== 'private') {
        await userLinkingService.shareTransactionWithLinkedUsers(user.uid, user.email!, fullTxn);
        await eventService.syncTransactionForRecipients(user.uid, user.email!, fullTxn);
        if (fullTxn.eventId) {
          await eventService.syncEventTransactionsForRecipients(user.uid, user.email!, fullTxn.eventId);
        }
      }

    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };


  const addImportedTransactions = async (imported: Omit<Transaction, 'id'>[]) => {
    if (!user) return;
    for (const transaction of imported) {
      const transactionWithPaidBy = { ...transaction, paidBy: transaction.paidBy || user.email || '' };
      await firestoreService.addTransaction(user.uid, transactionWithPaidBy);
    }
  };

  const updateTransaction = async (transaction: Transaction) => {
    if (!user) return;
    try {
      const oldEventId = transactions.find((t) => t.id === transaction.id)?.eventId;
      const previousTransaction = transactions.find((item) => item.id === transaction.id);
      await firestoreService.updateTransaction(user.uid, transaction);
      if (transaction.sharing === 'private') {
        await userLinkingService.deleteSharedTransaction(user.uid, transaction.id);
        await eventService.removeTransactionForRecipients(user.uid, transaction.id);
      } else if (previousTransaction?.sharing === 'private') {
        await userLinkingService.shareTransactionWithLinkedUsers(user.uid, user.email!, transaction);
        await eventService.syncTransactionForRecipients(user.uid, user.email!, transaction);
      } else {
        await userLinkingService.updateSharedTransaction(user.uid, user.email!, transaction);
        await eventService.syncTransactionForRecipients(user.uid, user.email!, transaction);
      }
      const eventIdsToSync = Array.from(new Set([oldEventId, transaction.eventId].filter(Boolean) as string[]));
      if (transaction.sharing !== 'private') {
        for (const eventId of eventIdsToSync) {
          await eventService.syncEventTransactionsForRecipients(user.uid, user.email!, eventId);
        }
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      const deletedTransaction = transactions.find((t) => t.id === id);
      await userLinkingService.deleteSharedTransaction(user.uid, id);
      await firestoreService.deleteTransaction(user.uid, id);
      await eventService.removeTransactionForRecipients(user.uid, id);
      if (deletedTransaction?.eventId) {
        await eventService.syncEventTransactionsForRecipients(user.uid, user.email!, deletedTransaction.eventId);
      }
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
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="brutalist-card flex items-center gap-4 bg-card p-5">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-foreground border-t-primary" />
            <p className="font-medium">Loading your financial data...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-7 sm:py-8">
        <DashboardHeader selectedDate={selectedDate} onDateChange={setSelectedDate} displayName={user?.displayName} />
        <QuickStats transactions={transactions} selectedDate={selectedDate} />
        <MonthlyPlan userId={user!.uid} transactions={transactions} selectedDate={selectedDate} />
        <RecurringBills userId={user!.uid} categories={categories} />
        <div className="grid gap-4 md:grid-cols-2"><StatementImport transactions={transactions} categories={categories} userEmail={user?.email || ''} onImport={addImportedTransactions} /><BankCsvImport transactions={transactions} categories={categories} userEmail={user?.email || ''} onImport={addImportedTransactions} /></div>
        
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
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
          
          <div className="space-y-5">
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
    </AppShell>
  );
};

export default Index;
