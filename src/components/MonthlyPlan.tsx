import { useEffect, useMemo, useState } from 'react';
import { endOfMonth, format, isWithinInterval, startOfMonth } from 'date-fns';
import { CalendarClock, Check, Pencil, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { firestoreService } from '@/services/firestoreService';
import { loanService } from '@/services/loanService';
import { getEMISchedule } from '@/utils/loanCalculations';
import type { Transaction } from '@/pages/Index';
import type { Loan } from '@/types/loan';
import type { RecurringBill } from '@/types/recurringBill';

interface MonthlyPlanProps {
  userId: string;
  transactions: Transaction[];
  selectedDate: Date;
}

interface Commitment {
  id: string;
  name: string;
  date: string;
  amount: number;
  label: string;
}

const formatCurrency = (amount: number) =>
  '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function getMonthCommitments(loans: Loan[], monthKey: string): Commitment[] {
  const commitments: Commitment[] = [];

  loans.filter((loan) => loan.status !== 'paid').forEach((loan) => {
    const schedule = getEMISchedule(loan);

    if (schedule.length > 0) {
      const dueItems = schedule.filter((emi) =>
        emi.status !== 'paid' && emi.dueDate.slice(0, 7) === monthKey
      );
      dueItems.forEach((emi) => {
        commitments.push({
          id: loan.id + '-' + emi.number,
          name: loan.lenderName,
          date: emi.dueDate,
          amount: Math.min(emi.amount, loan.remainingAmount),
          label: 'EMI',
        });
      });
      return;
    }

    if (loan.dueDate && loan.dueDate.slice(0, 7) === monthKey && loan.remainingAmount > 0) {
      commitments.push({
        id: loan.id,
        name: loan.lenderName,
        date: loan.dueDate,
        amount: loan.remainingAmount,
        label: 'Due',
      });
    }
  });

  return commitments.sort((a, b) => a.date.localeCompare(b.date));
}

export const MonthlyPlan = ({ userId, transactions, selectedDate }: MonthlyPlanProps) => {
  const { toast } = useToast();
  const monthKey = format(selectedDate, 'yyyy-MM');
  const [budget, setBudget] = useState<number | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBudgetLoading(true);
    setEditing(false);
    setError('');
    const unsubscribe = firestoreService.subscribeToMonthlyBudget(userId, monthKey, (amount) => {
      setBudget(amount);
      setDraft(amount ? String(amount) : '');
      setBudgetLoading(false);
    });
    return unsubscribe;
  }, [userId, monthKey]);

  useEffect(() => loanService.subscribeToLoans(userId, setLoans), [userId]);
  useEffect(() => firestoreService.subscribeToRecurringBills(userId, setBills), [userId]);

  const monthTotals = useMemo(() => {
    const interval = { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
    const monthTransactions = transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return !Number.isNaN(date.getTime()) && isWithinInterval(date, interval);
    });
    return {
      spent: monthTransactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      received: monthTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  }, [transactions, selectedDate]);

  const commitments = useMemo(() => getMonthCommitments(loans, monthKey), [loans, monthKey]);
  const billCommitments = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return bills.map((bill) => ({
      id: 'bill-' + bill.id,
      name: bill.name,
      date: format(new Date(year, month, Math.min(bill.dueDay, lastDay)), 'yyyy-MM-dd'),
      amount: bill.amount,
      label: 'Bill',
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [bills, selectedDate]);
  const allCommitments = [...commitments, ...billCommitments].sort((a, b) => a.date.localeCompare(b.date));
  const totalCommitments = allCommitments.reduce((sum, commitment) => sum + commitment.amount, 0);
  const outlook = monthTotals.received - monthTotals.spent - totalCommitments;
  const remaining = budget === null ? null : budget - monthTotals.spent;
  const progress = budget && budget > 0 ? Math.min((monthTotals.spent / budget) * 100, 100) : 0;

  const saveBudget = async () => {
    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a monthly plan greater than ₹0.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await firestoreService.saveMonthlyBudget(userId, monthKey, amount);
      setBudget(amount);
      setEditing(false);
      toast({ title: 'Monthly plan saved', description: 'Your plan for ' + format(selectedDate, 'MMMM yyyy') + ' is ready.' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your monthly plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-2 border-foreground bg-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5 text-primary" />
            Monthly plan
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Compare your monthly spending limit with recorded expenses.
          </p>
        </div>
        {budget !== null && !editing && (
          <Button variant="outline" size="sm" onClick={() => { setDraft(String(budget)); setEditing(true); }}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Adjust
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {editing ? (
          <div className="max-w-md space-y-2">
            <Label htmlFor="monthly-plan-amount">Spending limit for {format(selectedDate, 'MMMM yyyy')}</Label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                <Input
                  id="monthly-plan-amount"
                  type="number"
                  min="1"
                  step="100"
                  inputMode="decimal"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="e.g. 50000"
                  className="pl-8"
                  disabled={saving}
                />
              </div>
              <Button onClick={saveBudget} disabled={saving || budgetLoading}>
                <Check className="mr-1.5 h-4 w-4" />
                {saving ? 'Saving…' : 'Save plan'}
              </Button>
              <Button variant="ghost" onClick={() => { setEditing(false); setError(''); setDraft(budget === null ? '' : String(budget)); }} disabled={saving}>
                Cancel
              </Button>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        ) : budgetLoading ? (
          <p className="text-sm text-muted-foreground">Loading this month’s plan…</p>
        ) : budget === null ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Set a limit to see how much remains as you record or import expenses.
            </p>
            <Button onClick={() => setEditing(true)}>Set monthly plan</Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border-2 border-foreground bg-pastel-yellow p-3">
                <p className="text-xs font-medium text-muted-foreground">Spending limit</p>
                <p className="mt-1 font-display text-xl font-bold">{formatCurrency(budget)}</p>
              </div>
              <div className="rounded-lg border-2 border-foreground bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">Recorded spending</p>
                <p className="mt-1 font-display text-xl font-bold">{formatCurrency(monthTotals.spent)}</p>
              </div>
              <div className={'rounded-lg border-2 border-foreground p-3 ' + (remaining !== null && remaining < 0 ? 'bg-destructive/10' : 'bg-pastel-green')}>
                <p className="text-xs font-medium text-muted-foreground">
                  {remaining !== null && remaining < 0 ? 'Over plan' : 'Budget remaining'}
                </p>
                <p className={'mt-1 font-display text-xl font-bold ' + (remaining !== null && remaining < 0 ? 'text-destructive' : '')}>
                  {formatCurrency(Math.abs(remaining || 0))}
                  {remaining !== null && remaining < 0 ? ' over' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.toFixed(0)}% of plan used</span>
                <span>Income recorded: {formatCurrency(monthTotals.received)}</span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full border border-foreground bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                aria-label="Monthly spending plan used"
              >
                <div
                  className={'h-full transition-all ' + (progress >= 100 ? 'bg-destructive' : 'bg-primary')}
                  style={{ width: progress + '%' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cash-flow outlook subtracts upcoming bills and loan payments from recorded income after recorded spending. Planned commitments are not counted as recorded expenses.
              </p>
            </div>
          </>
        )}

        {!budgetLoading && (
          <div className="border-t pt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="h-4 w-4 text-primary" />
                Upcoming bills and loan payments · {format(selectedDate, 'MMMM')}
              </h3>
              {totalCommitments > 0 && <span className="text-sm font-semibold">{formatCurrency(totalCommitments)}</span>}
            </div>
            <p className={'mb-2 rounded-md px-3 py-2 text-sm font-medium ' + (outlook < 0 ? 'bg-destructive/10 text-destructive' : 'bg-pastel-green')}>Cash-flow outlook: {formatCurrency(outlook)} after upcoming commitments</p>
            {allCommitments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No recurring bills or loan payments are scheduled this month. Add bills above or repayment dates in <Link to="/loans" className="text-primary underline">Loans</Link>.
              </p>
            ) : (
              <div className="space-y-1.5">
                {allCommitments.map((commitment) => (
                  <div key={commitment.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium">{commitment.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{commitment.label} · {format(new Date(commitment.date + 'T12:00:00'), 'MMM d')}</span>
                    </div>
                    <span className="shrink-0 font-semibold">{formatCurrency(commitment.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
