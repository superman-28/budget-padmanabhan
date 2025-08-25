
import { useMemo } from 'react';
import { X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/pages/Index';
import { format, isToday } from 'date-fns';

interface CategoryDetailModalProps {
  categoryValue: string;
  categoryLabel: string;
  categoryIcon: string;
  categoryColor: string;
  transactions: Transaction[];
  onClose: () => void;
  onDeleteTransaction: (id: string) => void;
}

export const CategoryDetailModal = ({
  categoryValue,
  categoryLabel,
  categoryIcon,
  categoryColor,
  transactions,
  onClose,
  onDeleteTransaction
}: CategoryDetailModalProps) => {
  const categoryTransactions = useMemo(() => {
    return transactions
      .filter(t => t.category.split(',').map(c => c.trim()).includes(categoryValue))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, categoryValue]);

  const { totalExpenses, totalIncome, totalAmount } = useMemo(() => {
    let expenses = 0;
    let income = 0;
    
    categoryTransactions.forEach(t => {
      const categoryCount = t.category.split(',').length;
      const allocatedAmount = t.amount / categoryCount;
      
      if (t.type === 'expense') {
        expenses += allocatedAmount;
      } else {
        income += allocatedAmount;
      }
    });
    
    return {
      totalExpenses: expenses,
      totalIncome: income,
      totalAmount: expenses + income
    };
  }, [categoryTransactions]);

  const netAmount = totalExpenses - totalIncome;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden surface-elevated">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full" 
              style={{ backgroundColor: categoryColor }}
            />
            <span className="text-2xl">{categoryIcon}</span>
            <div>
              <h2 className="text-xl font-bold">{categoryLabel}</h2>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{categoryTransactions.length} transactions • ₹{totalAmount.toFixed(2)}</p>
                <div className="flex gap-4">
                  <span className="text-red-600">Spent: ₹{totalExpenses.toFixed(2)}</span>
                  <span className="text-green-600">Received: ₹{totalIncome.toFixed(2)}</span>
                  {netAmount > 0 && (
                    <span className="text-orange-600 font-medium">Owe: ₹{netAmount.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="overflow-y-auto">
          {categoryTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No transactions found for this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categoryTransactions.map((transaction) => {
                const categoryCount = transaction.category.split(',').length;
                const allocatedAmount = transaction.amount / categoryCount;
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg surface-variant"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>
                          {isToday(new Date(transaction.date)) 
                            ? 'Today' 
                            : format(new Date(transaction.date), 'MMM d, yyyy')
                          }
                        </span>
                        {categoryCount > 1 && (
                          <>
                            <span>•</span>
                            <span>Split across {categoryCount} categories</span>
                          </>
                        )}
                        <span>•</span>
                        <span className={`font-medium ${
                          transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type === 'expense' ? '-' : '+'}₹{allocatedAmount.toFixed(2)}
                        </p>
                        {categoryCount > 1 && (
                          <p className="text-xs text-muted-foreground">
                            of ₹{transaction.amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteTransaction(transaction.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
