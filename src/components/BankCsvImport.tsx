import { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, FileUp, Loader2, Plus, Trash2, ChevronDown, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const [categoryById, setCategoryById] = useState<Record<string, string[]>>({});
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
      setCategoryById(Object.fromEntries(result.transactions.map((entry) => [entry.transactionId, [suggestCategory(entry.description, categories)]])));
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
        category: (categoryById[entry.transactionId] ?? ['uncategorized']).join(',') || 'uncategorized',
        description: descriptionById[entry.transactionId] ?? entry.description,
        date: entry.date,
        type: entry.type,
        paidBy: userEmail,
        paymentMode: 'Bank transfer',
        source: 'bank_csv',
        sharing: 'private',
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
      <DialogContent className="w-[calc(100vw-1rem)] p-3 sm:max-w-5xl sm:p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden">
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
          <div className="max-h-[48vh] overflow-y-auto overflow-x-hidden rounded-lg border">
            <table className="w-full table-fixed text-xs sm:text-sm">
              <thead className="sticky top-0 bg-muted text-left"><tr><th className="w-[66px] p-1.5 sm:w-[150px] sm:p-2">Date</th><th className="p-1.5 sm:p-2">Description</th><th className="hidden w-[82px] p-2 sm:table-cell">Type</th><th className="w-[68px] p-1.5 text-right sm:w-[100px] sm:p-2">Amount</th><th className="w-[82px] p-1.5 sm:w-[145px] sm:p-2">Category</th><th className="w-[38px] p-1 text-center sm:w-[66px] sm:p-2"><span className="hidden sm:inline">Import</span></th></tr></thead>
              <tbody>{entries.map((entry) => {
                const duplicate = existingIds.has(entry.transactionId);
                const included = includedById[entry.transactionId] ?? !duplicate;
                return <tr key={entry.transactionId} className={'border-t ' + (!included ? 'bg-muted/50 text-muted-foreground opacity-60' : '')}>
                  <td className="whitespace-nowrap p-1.5 text-[10px] sm:p-2 sm:text-xs">{format(new Date(entry.date), 'dd MMM')}</td>
                  <td className="p-2"><Label className="sr-only" htmlFor={'bank-description-' + entry.transactionId}>Description</Label><Input id={'bank-description-' + entry.transactionId} className="h-8 w-full min-w-0 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm" value={descriptionById[entry.transactionId] ?? entry.description} onChange={(e) => setDescriptionById((current) => ({ ...current, [entry.transactionId]: e.target.value }))} /></td>
                  <td className="hidden p-2 capitalize sm:table-cell">{entry.type}</td>
                  <td className="whitespace-nowrap p-1.5 text-right text-[10px] sm:p-2 sm:text-sm">₹{entry.amount.toFixed(2)}</td>
                  
                  <td className="p-1 sm:p-2"><Label className="sr-only">Categories</Label><Popover>
                    <PopoverTrigger asChild><Button type="button" variant="outline" aria-label="Choose categories" className="h-8 w-full min-w-0 justify-between gap-1 px-1.5 text-[10px] font-normal sm:px-2 sm:text-xs"><span className="truncate">{(categoryById[entry.transactionId] ?? ['uncategorized']).length} selected</span><ChevronDown className="h-3 w-3 shrink-0" /></Button></PopoverTrigger>
                    <PopoverContent align="end" className="w-56 p-2"><div className="max-h-56 space-y-1 overflow-y-auto">
                      {[{ value: 'uncategorized', label: 'Uncategorized', icon: '🏷️' }, ...categories.filter((item) => item.value !== 'uncategorized')].map((category) => {
                        const selected = categoryById[entry.transactionId] ?? ['uncategorized'];
                        return <label key={category.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                          <Checkbox checked={selected.includes(category.value)} onCheckedChange={() => setCategoryById((current) => {
                            const values = current[entry.transactionId] ?? ['uncategorized'];
                            const next = category.value === 'uncategorized'
                              ? (values.includes('uncategorized') ? [] : ['uncategorized'])
                              : (values.includes(category.value)
                                ? values.filter((value) => value !== category.value)
                                : [...values.filter((value) => value !== 'uncategorized'), category.value]);
                            return { ...current, [entry.transactionId]: next };
                          })} />
                          <span>{category.icon} {category.label}</span>
                        </label>;
                      })}
                    </div></PopoverContent>
                  </Popover></td>
                  
                  <td className="p-1 text-center sm:p-2"><div className="flex flex-col items-center">
                    {!included && duplicate && <span className="hidden text-[10px] sm:block">Possible duplicate</span>}
                    <Button type="button" size="icon" variant="ghost" aria-label={included ? 'Remove transaction from import' : 'Add transaction to import'} title={included ? 'Remove from import' : 'Add possible duplicate'} className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setIncludedById((current) => ({ ...current, [entry.transactionId]: !included }))}>{included ? <Trash2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button>
                  </div></td>
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
