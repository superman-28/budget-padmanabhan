import { useMemo, useState } from 'react';
import { Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/pages/Index';
import { CollapsibleCard } from './CollapsibleCard';
import { CategoryDetailModal } from './CategoryDetailModal';
import { startOfMonth, endOfMonth, isWithinInterval, format, isToday } from 'date-fns';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  selectedDate: Date;
  categories: Array<{ value: string; label: string; icon: string; color: string }>;
}

export const TransactionList = ({ 
  transactions, 
  onDeleteTransaction, 
  selectedDate,
  categories
}: TransactionListProps) => {
  const [categoryDetail, setCategoryDetail] = useState<{
    value: string; label: string; icon: string; color: string;
  } | null>(null);

  const filteredTransactions = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    return transactions
      .filter(t => isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [transactions, selectedDate]);

  const getCategoryInfo = (categoryValue: string) => {
    return categories.find(cat => cat.value === categoryValue) || {
      value: categoryValue, label: categoryValue, icon: '💼', color: '#6b7280'
    };
  };

  const renderCategoryIndicator = (categoryString: string) => {
    const categoryValues = categoryString.split(',').map(c => c.trim());
    if (categoryValues.length === 1) {
      const category = getCategoryInfo(categoryValues[0]);
      return (
        <button onClick={() => setCategoryDetail(category)} className="flex items-center gap-1 hover:bg-accent rounded px-1 py-0.5 transition-colors">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }} />
          <span className="text-base">{category.icon}</span>
        </button>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <div className="flex w-3 h-3 rounded-full overflow-hidden">
          {categoryValues.map((catValue) => {
            const category = getCategoryInfo(catValue);
            return (
              <div key={catValue} className="h-full" style={{ backgroundColor: category.color, width: `${100 / categoryValues.length}%` }} />
            );
          })}
        </div>
        <span className="text-sm">{categoryValues.map(v => getCategoryInfo(v).icon).join('')}</span>
      </div>
    );
  };

  return (
    <>
      <CollapsibleCard
        title="Recent Transactions"
        icon={<Calendar className="h-4 w-4 text-primary" />}
        defaultOpen={true}
      >
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No transactions this month</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-2.5 rounded-lg group border border-border/50 hover:border-border transition-colors"
                style={{ borderLeft: `3px solid ${getCategoryInfo(transaction.category.split(',')[0].trim()).color}` }}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {renderCategoryIndicator(transaction.category)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{transaction.description}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">
                        {transaction.category.split(',').length > 1
                          ? 'Multiple' : getCategoryInfo(transaction.category).label}
                      </span>
                      <span>•</span>
                      <span>{isToday(new Date(transaction.date)) ? 'Today' : format(new Date(transaction.date), 'MMM d')}</span>
                      {transaction.paymentMode && (
                        <>
                          <span>•</span>
                          <span className="text-primary/70">{transaction.paymentMode}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className={`text-sm font-semibold ${transaction.type === 'expense' ? 'text-destructive' : 'text-success'}`}>
                    {transaction.type === 'expense' ? '-' : '+'}₹{transaction.amount.toFixed(2)}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => onDeleteTransaction(transaction.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive h-7 w-7 p-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {transactions.length > 10 && (
              <p className="text-center text-xs text-muted-foreground pt-1">Showing latest 10</p>
            )}
          </div>
        )}
      </CollapsibleCard>

      {categoryDetail && (
        <CategoryDetailModal
          categoryValue={categoryDetail.value}
          categoryLabel={categoryDetail.label}
          categoryIcon={categoryDetail.icon}
          categoryColor={categoryDetail.color}
          transactions={transactions}
          onClose={() => setCategoryDetail(null)}
          onDeleteTransaction={onDeleteTransaction}
        />
      )}
    </>
  );
};
