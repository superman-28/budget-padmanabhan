
import { useMemo, useState } from 'react';
import { Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/pages/Index';
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
    value: string;
    label: string;
    icon: string;
    color: string;
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
      value: categoryValue,
      label: categoryValue,
      icon: '💼',
      color: '#6b7280'
    };
  };

  const getCategoryColors = (categoryString: string) => {
    const categoryValues = categoryString.split(',').map(c => c.trim());
    return categoryValues.map(catValue => getCategoryInfo(catValue).color);
  };

  const getCardStyle = (categoryString: string) => {
    const colors = getCategoryColors(categoryString);
    if (colors.length === 1) {
      return { borderLeft: `4px solid ${colors[0]}` };
    } else {
      // Just use the first color for border, no background gradient
      return { borderLeft: `4px solid ${colors[0]}` };
    }
  };

  const renderCategoryIndicator = (categoryString: string) => {
    const categoryValues = categoryString.split(',').map(c => c.trim());
    
    if (categoryValues.length === 1) {
      const category = getCategoryInfo(categoryValues[0]);
      return (
        <button
          onClick={() => setCategoryDetail(category)}
          className="flex items-center gap-1 hover:bg-accent rounded px-1 py-0.5 transition-colors"
        >
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: category.color }}
          />
          <span className="text-xl">{category.icon}</span>
        </button>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <div className="flex w-3 h-3 rounded-full overflow-hidden">
          {categoryValues.map((catValue, index) => {
            const category = getCategoryInfo(catValue);
            return (
              <div
                key={catValue}
                className="h-full"
                style={{ 
                  backgroundColor: category.color,
                  width: `${100 / categoryValues.length}%`
                }}
              />
            );
          })}
        </div>
        <span className="text-lg">
          {categoryValues.map(catValue => getCategoryInfo(catValue).icon).join('')}
        </span>
      </div>
    );
  };

  if (filteredTransactions.length === 0) {
    return (
      <Card className="surface-elevated shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No transactions this month</p>
            <p className="text-sm">Add your first expense or income above</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="surface-elevated shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-lg group relative"
              style={getCardStyle(transaction.category)}
            >
              <div className="flex items-center gap-3 flex-1">
                {renderCategoryIndicator(transaction.category)}
                <div className="flex-1 min-w-0 max-w-[200px]">
                  <p className="font-medium truncate break-words" title={transaction.description}>
                    {transaction.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize truncate" title={
                      transaction.category.split(',').length > 1 
                        ? transaction.category.split(',').map(c => getCategoryInfo(c.trim()).label).join(', ')
                        : getCategoryInfo(transaction.category).label
                    }>
                      {transaction.category.split(',').length > 1 
                        ? 'Multiple categories' 
                        : getCategoryInfo(transaction.category).label
                      }
                    </span>
                    <span>•</span>
                    <span>
                      {isToday(new Date(transaction.date)) 
                        ? 'Today' 
                        : format(new Date(transaction.date), 'MMM d')
                      }
                    </span>
                    {transaction.paidBy && transaction.paidBy !== 'current-user' && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 text-xs">shared</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {transaction.type === 'expense' ? '-' : '+'}₹{transaction.amount.toFixed(2)}
                  </p>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteTransaction(transaction.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {transactions.length > 10 && (
            <p className="text-center text-xs text-muted-foreground pt-2">
              Showing latest 10 transactions
            </p>
          )}
        </CardContent>
      </Card>

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
