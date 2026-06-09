import { useMemo, useState } from 'react';
import { Calendar, Edit, User, MapPin } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Transaction } from '@/pages/Index';
import { TripEvent } from '@/types/event';
import { CollapsibleCard } from './CollapsibleCard';
import { TransactionEditForm } from './TransactionEditForm';
import { CategoryDetailModal } from './CategoryDetailModal';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';

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
    return categories.find(cat => cat.value === categoryValue) || {
      value: categoryValue, label: categoryValue, icon: '📝', color: '#6b7280'
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
        <button onClick={() => setCategoryDetail(category)} className="flex items-center gap-1.5 hover:bg-accent rounded px-1.5 py-0.5 transition-colors text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
          <span>{category.icon} {category.label}</span>
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
        <span>{categoryValues.map(v => getCategoryInfo(v).icon).join('')} ({categoryValues.length})</span>
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
            {/* Mobile: card view */}
            <div className="block sm:hidden space-y-2">
              {monthlyTransactions.map((transaction) => (
                <div key={transaction.id}>
                  <div className="p-3 rounded-lg border border-border/50 space-y-2" style={{ borderLeft: `3px solid ${getCategoryInfo(transaction.category.split(',')[0].trim()).color}` }}>
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(transaction.date), 'MMM dd')}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-sm font-semibold ${transaction.type === 'expense' ? 'text-destructive' : 'text-success'}`}>
                          {transaction.type === 'expense' ? '-' : '+'}₹{transaction.amount.toFixed(2)}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setEditingTransaction(transaction.id)} className="h-7 w-7 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {renderCategoryCell(transaction.category, transaction)}
                      {transaction.paidBy && <span className="text-primary/70">{transaction.paidBy}</span>}
                      {transaction.paymentMode && <span className="bg-accent px-1.5 py-0.5 rounded text-xs">{transaction.paymentMode}</span>}
                    </div>
                  </div>
                  {editingTransaction === transaction.id && (
                    <div className="mt-1">
                      <TransactionEditForm
                        transaction={transaction} categories={categories}
                        onSave={(t) => { onUpdateTransaction(t); setEditingTransaction(null); }}
                        onDelete={(id) => { onDeleteTransaction(id); setEditingTransaction(null); }}
                        onCancel={() => setEditingTransaction(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: table view */}
            <div className="hidden sm:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="py-2">Date</TableHead>
                    <TableHead className="py-2">Description</TableHead>
                    <TableHead className="py-2">Category</TableHead>
                    <TableHead className="py-2">By</TableHead>
                    <TableHead className="py-2">Mode</TableHead>
                    <TableHead className="py-2">Type</TableHead>
                    <TableHead className="text-right py-2">Amount</TableHead>
                    <TableHead className="text-right py-2">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyTransactions.map((transaction) => (
                    <>
                      <TableRow key={transaction.id} style={getRowStyle(transaction.category)} className="text-xs">
                        <TableCell className="py-2">{format(new Date(transaction.date), 'MMM dd')}</TableCell>
                        <TableCell className="py-2 max-w-[150px] truncate">{transaction.description}</TableCell>
                        <TableCell className="py-2">{renderCategoryCell(transaction.category, transaction)}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-primary" />
                            <span className="truncate max-w-[80px]">{transaction.paidBy || 'You'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {transaction.paymentMode && (
                            <span className="bg-accent px-1.5 py-0.5 rounded text-xs">{transaction.paymentMode}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === 'expense' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
                          }`}>{transaction.type}</span>
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <span className={`font-semibold ${transaction.type === 'expense' ? 'text-destructive' : 'text-success'}`}>
                            {transaction.type === 'expense' ? '-' : '+'}₹{transaction.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingTransaction(transaction.id)} className="h-7 w-7 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {editingTransaction === transaction.id && (
                        <TableRow key={`edit-${transaction.id}`}>
                          <TableCell colSpan={8} className="p-0">
                            <TransactionEditForm
                              transaction={transaction} categories={categories}
                              onSave={(t) => { onUpdateTransaction(t); setEditingTransaction(null); }}
                              onDelete={(id) => { onDeleteTransaction(id); setEditingTransaction(null); }}
                              onCancel={() => setEditingTransaction(null)}
                            />
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
