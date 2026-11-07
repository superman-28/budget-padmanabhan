import { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, FileUp, Loader2, Plus, Minus, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/pages/Index';
import { parseBankCsv, type BankCsvTransaction } from '@/utils/bankCsvParser';

type Category = { value: string; label: string; icon: string; color: string };

interface BankCsvImportProps {
  transactions: Transaction[];
  categories: Category[];
  userEmail: string;
  onImport: (transactions: Omit<Transaction, 'id'>[]) => Promise<void>;
}

const suggestCategory = (description: string, categories: Category[]) => {
  const text = description.toLowerCase();
  const terms: Array<[RegExp, RegExp]> = [
    [/restaurant|food|cafe|coffee|bakery|biryani/, /food|dining|restaurant/],
    [/metro|rail|bus|fuel|petrol|taxi|cab|uber|ola/, /travel|transport|commute|fuel/],
    [/market|grocery|supermarket|bazaar/, /grocery|shopping|household/],
    [/electricity|water bill|recharge|broadband|jio|airtel/, /bill|utility|phone|internet/],
  ];
  for (const [merchant, category] of terms) {
    if (merchant.test(text)) {
      const found = categories.find((item) => category.test(item.label + ' ' + item.value));
      if (found) return found.value;
    }
  }
  return 'uncategorized';
};

export const BankCsvImport = ({ transactions, categories, userEmail, onImport }: BankCsvImportProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState<BankCsvTransaction[]>([]);
  const [fileName, setFileName] = useState('');
  const [categoryById, setCategoryById] = useState<Record<string, string>>({});
  const [descriptionById, setDescriptionById] = useState<Record<string, string>>({});
  const [includedById, setIncludedById] = useState<Record<string, boolean>>({});
  const [confirmed, setConfirmed] = useState(false);

  const existingIds = useMemo(() => new Set(transactions.map((item) => item.sourceTransactionId).filter(Boolean)), [transactions]);
  const selected = entries.filter((entry) => includedById[entry.transactionId] ?? !existingIds.has(entry.transactionId));
  const duplicateCount = entries.filter((entry) => existingIds.has(entry.transactionId)).length;
  const totals = selected.reduce((sum, entry) => {
    if (entry.type === 'expense') sum.debits += entry.amount;
    else sum.credits += entry.amount;
    return sum;
  }, { debits: 0, credits: 0 });

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setEntries([]);
    setConfirmed(false);
    setFileName(file.name);
    setBusy(true);
    setOpen(true);
    try {
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
        throw new Error('Choose a bank statement in CSV format.');
      }
      if (file.size > 10 * 1024 * 1024) throw new Error('Choose a CSV smaller than 10 MB.');
      const result = parseBankCsv(await file.text());
      setEntries(result.transactions);
      setCategoryById(Object.fromEntries(result.transactions.map((entry) => [entry.transactionId, suggestCategory(entry.description, categories)])));
      setDescriptionById(Object.fromEntries(result.transactions.map((entry) => [entry.transactionId, entry.description])));
      setIncludedById(Object.fromEntries(result.transactions.map((entry) => [entry.transactionId, !transactions.some((item) => item.sourceTransactionId === entry.transactionId)])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The CSV could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!selected.length || !confirmed) return;
    setBusy(true);
    setError('');
    try {
      const rows: Omit<Transaction, 'id'>[] = selected.map((entry) => ({
        amount: entry.amount,
        category: categoryById[entry.transactionId] || 'uncategorized',
        description: descriptionById[entry.transactionId] ?? entry.description,
        date: entry.date,
        type: entry.type,
        paidBy: userEmail,
        paymentMode: 'Bank transfer',
        source: 'bank_csv',
        sourceTransactionId: entry.transactionId,
      }));
      await onImport(rows);
      toast({ title: 'Bank CSV imported', description: rows.length + ' transactions added.' });
      setOpen(false);
      setEntries([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The transactions could not be saved. You can retry.');
    } finally {
      setBusy(false);
    }
  };

  return <>
    <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
    <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border-2 border-foreground bg-background p-2"><FileSpreadsheet className="h-5 w-5 text-primary" /></div>
        <div><h2 className="font-semibold">Import a bank CSV</h2><p className="text-sm text-muted-foreground">Preview rows, check totals, and remove duplicates before saving.</p></div>
      </div>
      <Button onClick={() => inputRef.current?.click()} className="shrink-0"><FileUp className="mr-2 h-4 w-4" />Upload CSV</Button>
    </div>

    <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
      <DialogContent className="max-w-5xl">
        <DialogHeader><DialogTitle>Review bank statement</DialogTitle><DialogDescription>{fileName} · parsed in this browser; the original file is not uploaded.</DialogDescription></DialogHeader>
        {busy && <div className="flex items-center gap-3 rounded-lg border p-4 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Processing statement…</div>}
        {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {entries.length > 0 && <>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-2.5 py-1">{entries.length} rows read</span>
            {duplicateCount > 0 && <span className="rounded-full border px-2.5 py-1">{duplicateCount} possible duplicates shown dimmed</span>}
            <span className="rounded-full border px-2.5 py-1">Selected {selected.length}</span>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Selected totals for review</p>
            <div className="mt-1 flex flex-wrap gap-x-5 text-muted-foreground"><span>Debits: ₹{totals.debits.toFixed(2)}</span><span>Credits: ₹{totals.credits.toFixed(2)}</span><span>Net: ₹{(totals.credits - totals.debits).toFixed(2)}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">CSV exports often do not include a separate statement summary. Compare these totals and row count with your bank statement before import.</p>
          </div>
          <div className="max-h-[48vh] overflow-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-muted text-left"><tr><th className="p-2">Date</th><th className="p-2">Description</th><th className="p-2">Type</th><th className="p-2 text-right">Amount</th><th className="p-2">Category</th><th className="p-2">Import</th></tr></thead>
              <tbody>{entries.map((entry) => {
                const duplicate = existingIds.has(entry.transactionId);
                const included = includedById[entry.transactionId] ?? !duplicate;
                return <tr key={entry.transactionId} className={'border-t ' + (!included ? 'bg-muted/50 text-muted-foreground opacity-60' : '')}>
                  <td className="whitespace-nowrap p-2">{format(new Date(entry.date), 'dd MMM yyyy')}</td>
                  <td className="p-2"><Label className="sr-only" htmlFor={'bank-description-' + entry.transactionId}>Description</Label><Input id={'bank-description-' + entry.transactionId} className="min-w-[200px]" value={descriptionById[entry.transactionId] ?? entry.description} onChange={(e) => setDescriptionById((current) => ({ ...current, [entry.transactionId]: e.target.value }))} /></td>
                  <td className="p-2 capitalize">{entry.type}</td>
                  <td className="whitespace-nowrap p-2 text-right">₹{entry.amount.toFixed(2)}</td>
                  <td className="p-2"><Label className="sr-only" htmlFor={'bank-category-' + entry.transactionId}>Category</Label><select id={'bank-category-' + entry.transactionId} value={categoryById[entry.transactionId] || 'uncategorized'} onChange={(e) => setCategoryById((current) => ({ ...current, [entry.transactionId]: e.target.value }))} className="w-36 rounded-md border bg-background px-2 py-1.5 text-xs"><option value="uncategorized">Uncategorized</option>{categories.map((category) => <option key={category.value} value={category.value}>{category.icon} {category.label}</option>)}</select></td>
                  <td className="p-2"><div className="flex min-w-28 flex-col gap-1">{!included && duplicate && <span className="text-[10px]">Possible duplicate</span>}<Button type="button" size="sm" variant={included ? 'outline' : 'default'} onClick={() => setIncludedById((current) => ({ ...current, [entry.transactionId]: !included }))}>{included ? <><Minus className="mr-1 h-3 w-3" />Remove</> : <><Plus className="mr-1 h-3 w-3" />Add</>}</Button></div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" /><span>I compared the row count and debit/credit totals with my bank statement and want to import the selected transactions.</span></label>
          <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Only the selected transaction details are saved. The original CSV stays on this device.</p>
        </>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button onClick={handleImport} disabled={busy || !selected.length || !confirmed}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import {selected.length} transactions</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
};
