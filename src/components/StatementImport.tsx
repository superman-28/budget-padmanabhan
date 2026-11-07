import { useMemo, useRef, useState } from 'react';
import { FileText, FileUp, Loader2, ShieldCheck, Plus, Trash2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/pages/Index';
import type { GooglePayStatementTotals, GooglePayStatementTransaction } from '@/utils/gpayStatementParser';

type Category = { value: string; label: string; icon: string; color: string };

interface StatementImportProps {
  transactions: Transaction[];
  categories: Category[];
  userEmail: string;
  onImport: (transactions: Omit<Transaction, 'id'>[]) => Promise<void>;
}

function suggestCategory(description: string, categories: Category[]) {
  const merchant = description.toLowerCase();
  const rules: Array<{ merchant: RegExp; category: RegExp }> = [
    { merchant: /restaurant|food|cafe|coffee|tea|bakery|biryani|bhavan|canteen|hotel/, category: /food|dining|restaurant|eat/ },
    { merchant: /metro|rail|bmrcl|bus|fuel|petrol|filling station|taxi|cab/, category: /travel|transport|commute|fuel/ },
    { merchant: /market|grocery|super market|supermarket|store|bazaar/, category: /grocery|shopping|household/ },
    { merchant: /jio|airtel|recharge|broadband|electricity|water bill/, category: /bill|utility|phone|internet/ },
    { merchant: /jeweller|jewelry|pvr|inox|amazon|flipkart/, category: /shopping|entertainment/ },
  ];

  for (const rule of rules) {
    if (!rule.merchant.test(merchant)) continue;
    const match = categories.find((category) => rule.category.test(category.label + ' ' + category.value));
    if (match) return match.value;
  }
  return 'uncategorized';
}

export const StatementImport = ({ transactions, categories, userEmail, onImport }: StatementImportProps) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<{
    entries: GooglePayStatementTransaction[];
    selfTransfersSkipped: number;
    fileName: string;
    summaryTotals: GooglePayStatementTotals | null;
    parsedTotals: GooglePayStatementTotals;
  } | null>(null);
  const [categoryById, setCategoryById] = useState<Record<string, string[]>>({});
  const [descriptionById, setDescriptionById] = useState<Record<string, string>>({});
  const [confirmedTotalsWarning, setConfirmedTotalsWarning] = useState(false);
  const [includedById, setIncludedById] = useState<Record<string, boolean>>({});

  const existingStatementIds = useMemo(
    () => new Set(transactions.map((transaction) => transaction.sourceTransactionId).filter(Boolean)),
    [transactions]
  );
  const duplicateCount = parsed?.entries.filter((entry) => existingStatementIds.has(entry.transactionId)).length || 0;
  const skippedCount = parsed?.entries.filter((entry) => existingStatementIds.has(entry.transactionId) || entry.selfTransfer).length || 0;
  const selectedEntries = parsed?.entries.filter((entry) => includedById[entry.transactionId] ?? (!entry.selfTransfer && !existingStatementIds.has(entry.transactionId))) || [];
  const totalsMatch = Boolean(parsed?.summaryTotals &&
    Math.abs(parsed.summaryTotals.sent - parsed.parsedTotals.sent) < 0.01 &&
    Math.abs(parsed.summaryTotals.received - parsed.parsedTotals.received) < 0.01);
  const needsTotalsConfirmation = Boolean(parsed && !totalsMatch);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setParsed(null);
    setCategoryById({});
    setDescriptionById({});
    setConfirmedTotalsWarning(false);
    setIncludedById({});
    setParsing(true);
    setOpen(true);
    try {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Choose a PDF statement.');
      }
      const { parseGooglePayStatement } = await import('@/utils/gpayStatementParser');
      const result = await parseGooglePayStatement(file);
      setIncludedById(Object.fromEntries(result.transactions.map((entry) => [entry.transactionId, !entry.selfTransfer && !transactions.some((transaction) => transaction.sourceTransactionId === entry.transactionId)])));
      setParsed({
        entries: result.transactions,
        selfTransfersSkipped: result.selfTransfersSkipped,
        fileName: file.name,
        summaryTotals: result.summaryTotals,
        parsedTotals: result.parsedTotals,
      });
      setCategoryById(Object.fromEntries(
        result.transactions.map((entry) => [entry.transactionId, [suggestCategory(entry.description, categories)]])
      ));
      setDescriptionById(Object.fromEntries(
        result.transactions.map((entry) => [entry.transactionId, entry.description])
      ));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The statement could not be read.');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsed || selectedEntries.length === 0) return;
    setImporting(true);
    setError('');
    try {
      const rows: Omit<Transaction, 'id'>[] = selectedEntries.map((entry) => ({
        amount: entry.amount,
        category: (categoryById[entry.transactionId] ?? ['uncategorized']).join(',') || 'uncategorized',
        description: descriptionById[entry.transactionId] ?? entry.description,
        date: entry.date,
        type: entry.type,
        paidBy: userEmail,
        paymentMode: 'Google Pay (UPI)',
        source: 'gpay_statement',
        sharing: 'private',
        sourceTransactionId: entry.transactionId,
      }));
      await onImport(rows);
      toast({
        title: 'Statement imported',
        description: rows.length + ' transactions added. You can identify them by the “From statement” label.',
      });
      setOpen(false);
      setParsed(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The transactions could not be saved. You can retry safely.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFile}
      />
      <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-pastel-yellow p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border-2 border-foreground bg-card p-2">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Import a Google Pay statement</h2>
            <p className="text-sm text-muted-foreground">Review transactions before adding them to your budget.</p>
          </div>
        </div>
        <Button onClick={() => fileInput.current?.click()} className="shrink-0">
          <FileUp className="mr-2 h-4 w-4" />
          Upload PDF
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!parsing && !importing) setOpen(nextOpen);
      }}>
        <DialogContent className="w-[calc(100vw-1rem)] p-3 sm:max-w-4xl sm:p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Review Google Pay statement</DialogTitle>
            <DialogDescription>
              Confirm the extracted details and categories before importing. Your PDF is read on this device and is not stored.
            </DialogDescription>
          </DialogHeader>

          {parsing && (
            <div className="flex items-center gap-3 rounded-lg border p-4 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading statement pages…
            </div>
          )}

          {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          {parsed && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-foreground/20 bg-accent px-2.5 py-1">{parsed.fileName}</span>
                <span>{parsed.entries.length} transactions found</span>
                {duplicateCount > 0 && <span>{duplicateCount} already imported by default</span>}
                {skippedCount > 0 && <span>{skippedCount} skipped by default (dimmed below)</span>}
              </div>

              <div className={'rounded-lg border p-3 text-xs ' + (totalsMatch ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5')}>
                <p role="status" className={totalsMatch ? 'font-medium text-success' : 'font-medium text-destructive'}>
                  {totalsMatch
                    ? 'Extracted totals match the statement summary.'
                    : parsed.summaryTotals
                      ? 'Extracted totals do not match the statement summary. Review the rows before importing.'
                      : 'Statement summary totals could not be read. Review the rows before importing.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  <span>Statement sent: {parsed.summaryTotals ? '₹' + parsed.summaryTotals.sent.toFixed(2) : 'Unavailable'}</span>
                  <span>Extracted sent: ₹{parsed.parsedTotals.sent.toFixed(2)}</span>
                  <span>Statement received: {parsed.summaryTotals ? '₹' + parsed.summaryTotals.received.toFixed(2) : 'Unavailable'}</span>
                  <span>Extracted received: ₹{parsed.parsedTotals.received.toFixed(2)}</span>
                </div>
              </div>
              {needsTotalsConfirmation && selectedEntries.length > 0 && (
                <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={confirmedTotalsWarning}
                    onChange={(event) => setConfirmedTotalsWarning(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>I reviewed the extracted transactions and want to import them despite the totals check.</span>
                </label>
              )}

              {parsed.entries.length === 0 ? (
                <p className="rounded-md border p-4 text-sm text-muted-foreground">No transactions are selected. Use Add to import a dimmed row.</p>
              ) : (
                <div className="max-h-[55vh] overflow-y-auto overflow-x-hidden rounded-lg border">
                  <table className="w-full table-fixed text-xs sm:text-sm">
                    <thead className="sticky top-0 bg-muted text-left">
                      <tr>
                        <th className="w-[66px] p-1.5 sm:w-[150px] sm:p-2">Date</th>
                        <th className="p-1.5 sm:p-2">Description</th>
                        <th className="hidden w-[82px] p-2 sm:table-cell">Type</th>
                        <th className="w-[68px] p-1.5 text-right sm:w-[100px] sm:p-2">Amount</th>
                        <th className="w-[82px] p-1.5 sm:w-[145px] sm:p-2">Category</th>
                        <th className="w-[38px] p-1 text-center sm:w-[66px] sm:p-2"><span className="hidden sm:inline">Import</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.entries.map((entry) => {
                        const included = includedById[entry.transactionId] ?? (!entry.selfTransfer && !existingStatementIds.has(entry.transactionId));
                        const duplicate = existingStatementIds.has(entry.transactionId);
                        return (
                        <tr key={entry.transactionId} className={'border-t ' + (!included ? 'bg-muted/50 text-muted-foreground opacity-60' : '')}>
                          <td className="whitespace-nowrap p-1.5 text-[10px] sm:p-2 sm:text-xs">{format(new Date(entry.date), 'dd MMM')}</td>
                          <td className="p-2">
                            <Label className="sr-only" htmlFor={'description-' + entry.transactionId}>Description</Label>
                            <Input
                              id={'description-' + entry.transactionId}
                              value={descriptionById[entry.transactionId] ?? entry.description}
                              onChange={(e) => setDescriptionById((current) => ({ ...current, [entry.transactionId]: e.target.value }))}
                              className="h-8 w-full min-w-0 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
                            />
                          </td>
                          <td className="hidden p-2 capitalize sm:table-cell">{entry.selfTransfer ? 'Self transfer' : entry.type}</td>
                          <td className="whitespace-nowrap p-1.5 text-right text-[10px] font-medium sm:p-2 sm:text-sm">₹{entry.amount.toFixed(2)}</td>
                          
                          <td className="p-1 sm:p-2">
                            <Label className="sr-only">Categories</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="outline" disabled={entry.selfTransfer} aria-label="Choose categories" className="h-8 w-full min-w-0 justify-between gap-1 px-1.5 text-[10px] font-normal sm:px-2 sm:text-xs">
                                  <span className="truncate">{(categoryById[entry.transactionId] ?? ['uncategorized']).length} selected</span>
                                  <ChevronDown className="h-3 w-3 shrink-0" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-56 p-2">
                                <div className="max-h-56 space-y-1 overflow-y-auto">
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
                                </div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          
                          <td className="p-1 text-center sm:p-2">
                            {!included && <span className="hidden text-[10px] sm:block">{entry.selfTransfer ? 'Self transfer' : ''}{entry.selfTransfer && duplicate ? ' · ' : ''}{duplicate ? 'Already imported' : ''}</span>}
                            <Button type="button" size="icon" variant="ghost" aria-label={included ? 'Remove transaction from import' : 'Add transaction to import'} title={included ? 'Remove from import' : (entry.selfTransfer ? 'Add self transfer' : duplicate ? 'Add duplicate' : 'Add to import')} className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setIncludedById((current) => ({ ...current, [entry.transactionId]: !included }))}>
                              {included ? <Trash2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Only transaction details are saved to your account. The original PDF stays on this device.
              </p>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={parsing || importing}>Cancel</Button>
            {parsed && (
              <Button onClick={handleImport} disabled={importing || selectedEntries.length === 0 || (needsTotalsConfirmation && !confirmedTotalsWarning)}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {selectedEntries.length} transactions
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
