
import { useMemo } from 'react';
import { Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/pages/Index';
import { startOfMonth, endOfMonth, isWithinInterval, format, isToday } from 'date-fns';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  selectedDate: Date;
}

const categoryEmojis: Record<string, string> = {
  food: '🍽️',
  transport: '🚗',
  entertainment: '🎬',
  shopping: '🛍️',
  bills: '📄',
  health: '🏥',
  other: '💼',
};

export const TransactionList = ({ 
  transactions, 
  onDeleteTransaction, 
  selectedDate 
}: TransactionListProps) => {
  const filteredTransactions = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    
    return transactions
      .filter(t => isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Show only latest 10 transactions
  }, [transactions, selectedDate]);

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
            className="flex items-center justify-between p-3 rounded-lg surface-variant interactive group"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="text-xl">
                {categoryEmojis[transaction.category] || '💼'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{transaction.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{transaction.category}</span>
                  <span>•</span>
                  <span>
                    {isToday(new Date(transaction.date)) 
                      ? 'Today' 
                      : format(new Date(transaction.date), 'MMM d')
                    }
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {transaction.type === 'expense' ? '-' : '+'}${transaction.amount.toFixed(2)}
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
  );
};
