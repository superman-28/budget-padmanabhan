import { useMemo, useRef, useState } from 'react';
import { FileText, FileUp, Loader2, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/pages/Index';
import type { GooglePayStatementTransaction } from '@/utils/gpayStatementParser';

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
  } | null>(null);
  const [categoryById, setCategoryById] = useState<Record<string, string>>({});
  const [descriptionById, setDescriptionById] = useState<Record<string, string>>({});

  const existingStatementIds = useMemo(
    () => new Set(transactions.map((transaction) => transaction.sourceTransactionId).filter(Boolean)),
    [transactions]
  );
  const duplicateCount = parsed?.entries.filter((entry) => existingStatementIds.has(entry.transactionId)).length || 0;
  const newEntries = parsed?.entries.filter((entry) => !existingStatementIds.has(entry.transactionId)) || [];

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setParsed(null);
    setCategoryById({});
    setDescriptionById({});
    setParsing(true);
    setOpen(true);
    try {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Choose a PDF statement.');
      }
      const { parseGooglePayStatement } = await import('@/utils/gpayStatementParser');
      const result = await parseGooglePayStatement(file);
      setParsed({ entries: result.transactions, selfTransfersSkipped: result.selfTransfersSkipped, fileName: file.name });
      setCategoryById(Object.fromEntries(
        result.transactions.map((entry) => [entry.transactionId, suggestCategory(entry.description, categories)])
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
    if (!parsed || newEntries.length === 0) return;
    setImporting(true);
    setError('');
    try {
      const rows: Omit<Transaction, 'id'>[] = newEntries.map((entry) => ({
        amount: entry.amount,
        category: categoryById[entry.transactionId] || 'uncategorized',
        description: descriptionById[entry.transactionId] ?? entry.description,
        date: entry.date,
        type: entry.type,
        paidBy: userEmail,
        paymentMode: 'Google Pay (UPI)',
        source: 'gpay_statement',
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
        <DialogContent className="max-w-4xl">
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
                {duplicateCount > 0 && <span>{duplicateCount} already imported, will be skipped</span>}
                {parsed.selfTransfersSkipped > 0 && <span>{parsed.selfTransfersSkipped} self-transfers skipped</span>}
              </div>

              {newEntries.length === 0 ? (
                <p className="rounded-md border p-4 text-sm text-muted-foreground">Every transaction in this statement has already been imported.</p>
              ) : (
                <div className="max-h-[55vh] overflow-auto rounded-lg border">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="sticky top-0 bg-muted text-left">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Description</th>
                        <th className="p-2">Type</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newEntries.map((entry) => (
                        <tr key={entry.transactionId} className="border-t">
                          <td className="whitespace-nowrap p-2">{format(new Date(entry.date), 'dd MMM yyyy, h:mm a')}</td>
                          <td className="p-2">
                            <Label className="sr-only" htmlFor={'description-' + entry.transactionId}>Description</Label>
                            <Input
                              id={'description-' + entry.transactionId}
                              value={descriptionById[entry.transactionId] ?? entry.description}
                              onChange={(e) => setDescriptionById((current) => ({ ...current, [entry.transactionId]: e.target.value }))}
                              className="min-w-[210px] max-w-[300px]"
                            />
                          </td>
                          <td className="p-2 capitalize">{entry.type}</td>
                          <td className="whitespace-nowrap p-2 text-right font-medium">₹{entry.amount.toFixed(2)}</td>
                          <td className="p-2">
                            <Label className="sr-only" htmlFor={'category-' + entry.transactionId}>Category</Label>
                            <select
                              id={'category-' + entry.transactionId}
                              value={categoryById[entry.transactionId] || 'uncategorized'}
                              onChange={(e) => setCategoryById((current) => ({ ...current, [entry.transactionId]: e.target.value }))}
                              className="w-36 rounded-md border bg-background px-2 py-1.5 text-xs"
                            >
                              <option value="uncategorized">Uncategorized</option>
                              {categories.map((category) => (
                                <option key={category.value} value={category.value}>{category.icon} {category.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
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
              <Button onClick={handleImport} disabled={importing || newEntries.length === 0}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {newEntries.length} transactions
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
