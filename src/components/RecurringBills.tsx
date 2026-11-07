import { useEffect, useState } from 'react';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { firestoreService } from '@/services/firestoreService';
import { useToast } from '@/hooks/use-toast';
import type { RecurringBill } from '@/types/recurringBill';

interface RecurringBillsProps {
  userId: string;
  categories: Array<{ value: string; label: string; icon: string; color: string }>;
}

const currency = (value: number) => '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const RecurringBills = ({ userId, categories }: RecurringBillsProps) => {
  const { toast } = useToast();
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [category, setCategory] = useState('uncategorized');
  const [saving, setSaving] = useState(false);

  useEffect(() => firestoreService.subscribeToRecurringBills(userId, setBills), [userId]);

  const addBill = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    const day = Number(dueDay);
    if (!name.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || !Number.isInteger(day) || day < 1 || day > 31) {
      toast({ title: 'Check bill details', description: 'Enter a bill name, positive amount, and due day from 1 to 31.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await firestoreService.addRecurringBill(userId, { name: name.trim(), amount: numericAmount, dueDay: day, category });
      setName(''); setAmount('');
      toast({ title: 'Recurring bill added', description: 'It will appear in each month’s cash-flow outlook.' });
    } catch {
      toast({ title: 'Could not save bill', description: 'Please try again.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const removeBill = async (bill: RecurringBill) => {
    try {
      await firestoreService.deleteRecurringBill(userId, bill.id);
      toast({ title: 'Recurring bill removed', description: bill.name + ' is no longer included in the outlook.' });
    } catch {
      toast({ title: 'Could not remove bill', description: 'Please try again.', variant: 'destructive' });
    }
  };

  return <Card className="border-2 border-foreground shadow-sm">
    <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-5 w-5 text-primary" />Recurring bills</CardTitle><p className="text-xs text-muted-foreground">Add regular monthly bills to see what’s coming due.</p></CardHeader>
    <CardContent className="space-y-4">
      <form onSubmit={addBill} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1"><Label htmlFor="recurring-name">Bill name</Label><Input id="recurring-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Internet" /></div>
        <div className="space-y-1"><Label htmlFor="recurring-amount">Amount</Label><Input id="recurring-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="999" /></div>
        <div className="space-y-1"><Label htmlFor="recurring-day">Due day</Label><Input id="recurring-day" type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></div>
        <div className="flex items-end"><Button type="submit" disabled={saving} className="w-full"><Plus className="mr-1.5 h-4 w-4" />Add bill</Button></div>
        <div className="space-y-1 sm:col-span-2"><Label htmlFor="recurring-category">Category</Label><select id="recurring-category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="uncategorized">Uncategorized</option>{categories.map((item) => <option key={item.value} value={item.value}>{item.icon} {item.label}</option>)}</select></div>
      </form>
      {bills.length === 0 ? <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No recurring bills yet.</p> : <ul className="divide-y rounded-md border">{bills.map((bill) => <li key={bill.id} className="flex items-center justify-between gap-3 px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{bill.name}</p><p className="text-xs text-muted-foreground">Due day {bill.dueDay} · {bill.category}</p></div><div className="flex shrink-0 items-center gap-2"><span className="text-sm font-semibold">{currency(bill.amount)}</span><Button type="button" variant="ghost" size="icon" aria-label={'Remove ' + bill.name} onClick={() => removeBill(bill)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></li>)}</ul>}
    </CardContent>
  </Card>;
};
