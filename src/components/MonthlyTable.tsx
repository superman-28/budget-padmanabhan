import { useEffect, useMemo, useState } from 'react';
import { Calendar, Edit, User, MapPin, Columns3, ChevronDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Transaction } from '@/pages/Index';
import { TripEvent } from '@/types/event';
import { CollapsibleCard } from './CollapsibleCard';
import { TransactionEditForm } from './TransactionEditForm';
import { CategoryDetailModal } from './CategoryDetailModal';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { getCategoryColor } from '@/lib/categoryColors';

type MonthlyColumn = 'date' | 'description' | 'category' | 'paidBy' | 'paymentMode' | 'type' | 'amount';

const MONTHLY_COLUMNS: Array<{ key: MonthlyColumn; label: string }> = [
  { key: 'date', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'paidBy', label: 'Paid by' },
  { key: 'paymentMode', label: 'Payment mode' },
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Amount' },
];
const DEFAULT_MONTHLY_COLUMNS: MonthlyColumn[] = ['date', 'description', 'category', 'paidBy', 'type', 'amount'];

interface MonthlyTableProps {
  transactions: Transaction[];
  selectedDate: Date;
  categories: Array<{ value: string; label: string; icon: string; color: string }>;
  events?: TripEvent[];
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const MonthlyTable = ({ 
  transactions, selectedDate, categories, events = [], onUpdateTransaction, onDeleteTransaction 
}: MonthlyTableProps) => {
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<MonthlyColumn[]>(() => {
    try {
      const saved = localStorage.getItem('monthly-overview-visible-columns');
      if (!saved) return DEFAULT_MONTHLY_COLUMNS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? MONTHLY_COLUMNS.map((column) => column.key).filter((key) => parsed.includes(key)) : DEFAULT_MONTHLY_COLUMNS;
    } catch {
      return DEFAULT_MONTHLY_COLUMNS;
    }
  });
  const hasColumn = (column: MonthlyColumn) => visibleColumns.includes(column);
  useEffect(() => {
    try { localStorage.setItem('monthly-overview-visible-columns', JSON.stringify(visibleColumns)); } catch { /* Keep current view if storage is unavailable. */ }
  }, [visibleColumns]);
  const [categoryDetail, setCategoryDetail] = useState<{
    value: string; label: string; icon: string; color: string;
  } | null>(null);

  const monthlyTransactions = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    return transactions
      .filter(t => isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedDate]);

  const getCategoryInfo = (categoryValue: string) => {
    const found = categories.find(cat => cat.value === categoryValue);
    return {
      value: categoryValue,
      label: found?.label || categoryValue,
      icon: found?.icon || '📝',
      color: getCategoryColor(categoryValue),
    };
  };

  const getRowStyle = (categoryString: string) => {
    const colors = categoryString.split(',').map(c => getCategoryInfo(c.trim()).color);
    if (colors.length === 1) return { borderLeft: `3px solid ${colors[0]}` };
    const colorWidth = 100 / colors.length;
    const stops = colors.map((color, i) => `${color} ${i * colorWidth}% ${(i + 1) * colorWidth}%`).join(', ');
    return { borderLeft: '3px solid transparent', backgroundImage: `linear-gradient(90deg, ${stops})`, backgroundSize: '3px 100%', backgroundRepeat: 'no-repeat' as const };
  };

  const renderCategoryCell = (categoryString: string, transaction: Transaction) => {
    const categoryValues = categoryString.split(',').map(c => c.trim());
    if (categoryValues.length === 1) {
      const category = getCategoryInfo(categoryValues[0]);
      return (
        <button onClick={() => setCategoryDetail(category)} className="flex max-w-full min-w-0 items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-accent">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
          <span className="truncate">{category.icon} {category.label}</span>
        </button>
      );
    }
    return (
      <div className="flex items-center gap-1 text-xs">
        <div className="flex w-3 h-3 rounded-full overflow-hidden">
          {categoryValues.map((catValue) => {
            const cat = getCategoryInfo(catValue);
            return <div key={catValue} className="h-full" style={{ backgroundColor: cat.color, width: `${100 / categoryValues.length}%` }} />;
          })}
        </div>
        <span className="truncate">{categoryValues.map(v => getCategoryInfo(v).icon).join('')} ({categoryValues.length})</span>
      </div>
    );
  };

  const totalExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <CollapsibleCard
        title={`Monthly Overview - ${format(selectedDate, 'MMM yyyy')}`}
        icon={<Calendar className="h-4 w-4 text-primary" />}
        defaultOpen={false}
        className="bg-pastel-green"
      >
        {monthlyTransactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No transactions this month</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm"><Columns3 className="mr-2 h-4 w-4" />Columns <ChevronDown className="ml-2 h-3 w-3" /></Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-2">
                  <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">Show columns</p>
                  <div className="space-y-1">
                    {MONTHLY_COLUMNS.map((column) => (
                      <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                        <Checkbox checked={hasColumn(column.key)} onCheckedChange={(checked) => setVisibleColumns((current) =>
                          checked === true ? [...current, column.key] : current.filter((key) => key !== column.key)
                        )} />
                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setVisibleColumns(DEFAULT_MONTHLY_COLUMNS)}>Reset to default</Button>
                </PopoverContent>
              </Popover>
            </div>

            {/* Mobile: compact transaction cards */}
            <div className="block space-y-2 sm:hidden">
              {monthlyTransactions.map((transaction) => (
                <div key={transaction.id}>
                  <div className="space-y-2 rounded-lg border border-border/50 p-3" style={{ borderLeft: `3px solid ${getCategoryInfo(transaction.category.split(',')[0].trim()).color}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {hasColumn('description') && <p className="truncate text-sm font-medium" title={transaction.description}>{transaction.description}</p>}
                        {hasColumn('date') && <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{format(new Date(transaction.date), 'MMM dd')}{(transaction.source === 'gpay_statement' || transaction.source === 'bank_csv') && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Statement</span>}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {hasColumn('amount') && <span className={`text-sm font-semibold ${transaction.type === 'expense' ? 'text-destructive' : transaction.type === 'income' ? 'text-success' : 'text-muted-foreground'}`}>
                          {transaction.type === 'expense' ? '-' : transaction.type === 'income' ? '+' : '↔'}₹{transaction.amount.toFixed(2)}
                        </span>}
                        <Button variant="ghost" size="sm" aria-label="Edit transaction" onClick={() => setEditingTransaction(transaction.id)} className="h-7 w-7 p-0"><Edit className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {hasColumn('category') && renderCategoryCell(transaction.category, transaction)}
                      {hasColumn('type') && <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{transaction.type}</span>}
                      {hasColumn('paidBy') && transaction.paidBy && <span className="flex max-w-full items-center gap-1 truncate text-primary/70"><User className="h-3 w-3 shrink-0" /><span className="truncate">{transaction.paidBy}</span></span>}
                      {hasColumn('paymentMode') && transaction.paymentMode && <span className="max-w-full truncate rounded bg-accent px-1.5 py-0.5" title={transaction.paymentMode}>{transaction.paymentMode}</span>}
                      {transaction.eventName && <span className="inline-flex max-w-full items-center gap-1 truncate rounded bg-pastel-indigo px-1.5 py-0.5 text-foreground"><MapPin className="h-3 w-3 shrink-0" />{transaction.eventName}</span>}
                    </div>
                  </div>
                  {editingTransaction === transaction.id && (
                    <div className="mt-1">
                      <TransactionEditForm transaction={transaction} categories={categories} events={events}
                        onSave={(t) => { onUpdateTransaction(t); setEditingTransaction(null); }}
                        onDelete={(id) => { onDeleteTransaction(id); setEditingTransaction(null); }}
                        onCancel={() => setEditingTransaction(null)} />
                    </div>
                  )}
                </div>
              ))}
            </div>

                        {/* Desktop: fixed-width, readable table */}
            <div className="hidden rounded-md border sm:block">
              <Table className="table-fixed text-xs lg:text-sm">
                <TableHeader>
                  <TableRow className="bg-muted/70 text-xs">
                    {hasColumn('date') && <TableHead className="w-[68px] px-2 py-2 md:w-[84px]">Date</TableHead>}
                    {hasColumn('description') && <TableHead className="px-2 py-2">Description</TableHead>}
                    {hasColumn('category') && <TableHead className="w-[110px] px-2 py-2 lg:w-[150px]">Category</TableHead>}
                    {hasColumn('paidBy') && <TableHead className="w-[100px] px-2 py-2 lg:w-[135px]">Paid by</TableHead>}
                    {hasColumn('paymentMode') && <TableHead className="w-[95px] px-2 py-2 lg:w-[125px]">Payment mode</TableHead>}
                    {hasColumn('type') && <TableHead className="w-[72px] px-2 py-2 lg:w-[90px]">Type</TableHead>}
                    {hasColumn('amount') && <TableHead className="w-[95px] px-2 py-2 text-right lg:w-[115px]">Amount</TableHead>}
                    <TableHead className="w-[42px] px-1 py-2 text-center">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyTransactions.map((transaction) => (
                    <>
                      <TableRow key={transaction.id} style={getRowStyle(transaction.category)} className="text-xs hover:bg-muted/30">
                        {hasColumn('date') && <TableCell className="whitespace-nowrap px-2 py-2.5 text-muted-foreground">{format(new Date(transaction.date), 'MMM dd')}</TableCell>}
                        {hasColumn('description') && <TableCell className="px-2 py-2.5">
                          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                            <span className="truncate font-medium" title={transaction.description}>{transaction.description}</span>
                            {(transaction.source === 'gpay_statement' || transaction.source === 'bank_csv') && <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">Statement</span>}
                            {transaction.eventName && <span className="shrink-0 truncate rounded bg-pastel-indigo px-1 py-0.5 text-[9px]" title={transaction.eventName}>{transaction.eventName}</span>}
                          </div>
                        </TableCell>}
                        {hasColumn('category') && <TableCell className="overflow-hidden px-2 py-2.5">{renderCategoryCell(transaction.category, transaction)}</TableCell>}
                        {hasColumn('paidBy') && <TableCell className="overflow-hidden px-2 py-2.5">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <User className="h-3 w-3 shrink-0 text-primary" />
                            <span className="truncate" title={transaction.paidBy || 'You'}>{transaction.paidBy || 'You'}</span>
                          </div>
                        </TableCell>}
                        {hasColumn('paymentMode') && <TableCell className="overflow-hidden px-2 py-2.5">
                          {transaction.paymentMode && <span className="block truncate rounded bg-accent px-1.5 py-1 whitespace-nowrap" title={transaction.paymentMode}>{transaction.paymentMode}</span>}
                        </TableCell>}
                        {hasColumn('type') && <TableCell className="px-2 py-2.5">
                          <span className={`inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${transaction.type === 'expense' ? 'bg-destructive/10 text-destructive' : transaction.type === 'income' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{transaction.type}</span>
                        </TableCell>}
                        {hasColumn('amount') && <TableCell className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums">
                          <span className={transaction.type === 'expense' ? 'text-destructive' : transaction.type === 'income' ? 'text-success' : 'text-muted-foreground'}>
                            {transaction.type === 'expense' ? '−' : transaction.type === 'income' ? '+' : '↔'}₹{transaction.amount.toFixed(2)}
                          </span>
                        </TableCell>}
                        <TableCell className="px-1 py-2 text-center">
                          <Button variant="ghost" size="sm" aria-label="Edit transaction" onClick={() => setEditingTransaction(transaction.id)} className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                      {editingTransaction === transaction.id && (
                        <TableRow key={`edit-${transaction.id}`}>
                          <TableCell colSpan={visibleColumns.length + 1} className="p-0">
                            <TransactionEditForm transaction={transaction} categories={categories} events={events}
                              onSave={(t) => { onUpdateTransaction(t); setEditingTransaction(null); }}
                              onDelete={(id) => { onDeleteTransaction(id); setEditingTransaction(null); }}
                              onCancel={() => setEditingTransaction(null)} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>

                        <div className="mt-3 flex flex-wrap justify-between items-center text-xs text-muted-foreground gap-2">
              <span>{monthlyTransactions.length} transactions</span>
              <div className="flex gap-3">
                <span className="text-destructive font-medium">Expenses: ₹{totalExpenses.toFixed(2)}</span>
                <span className="text-success font-medium">Income: ₹{totalIncome.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </CollapsibleCard>

      {categoryDetail && (
        <CategoryDetailModal
          categoryValue={categoryDetail.value} categoryLabel={categoryDetail.label}
          categoryIcon={categoryDetail.icon} categoryColor={categoryDetail.color}
          transactions={transactions} onClose={() => setCategoryDetail(null)}
          onDeleteTransaction={onDeleteTransaction}
        />
      )}
    </>
  );
};
