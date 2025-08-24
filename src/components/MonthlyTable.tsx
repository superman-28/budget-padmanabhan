
import { useMemo, useState } from 'react';
import { Calendar, Edit, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/pages/Index';
import { TransactionEditForm } from './TransactionEditForm';
import { CategoryDetailModal } from './CategoryDetailModal';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';

interface MonthlyTableProps {
  transactions: Transaction[];
  selectedDate: Date;
  categories: Array<{ value: string; label: string; icon: string; color: string }>;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const MonthlyTable = ({ 
  transactions, 
  selectedDate, 
  categories, 
  onUpdateTransaction,
  onDeleteTransaction 
}: MonthlyTableProps) => {
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [categoryDetail, setCategoryDetail] = useState<{
    value: string;
    label: string;
    icon: string;
    color: string;
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
      label: categoryValue,
      icon: '📝',
      color: '#6b7280'
    };
  };

  const renderCategoryCell = (categoryString: string) => {
    const categoryValues = categoryString.split(',');
    
    if (categoryValues.length === 1) {
      const category = getCategoryInfo(categoryValues[0]);
      return (
        <button
          onClick={() => setCategoryDetail(category)}
          className="flex items-center gap-2 hover:bg-accent rounded px-2 py-1 transition-colors"
        >
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: category.color }}
          />
          <span className="text-sm">{category.icon} {category.label}</span>
        </button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <div className="flex w-3 h-3 rounded-full overflow-hidden">
          {categoryValues.map((catValue, index) => {
            const category = getCategoryInfo(catValue.trim());
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
        <span className="text-sm">
          {categoryValues.map(catValue => getCategoryInfo(catValue.trim()).icon).join('')} 
          Multiple ({categoryValues.length})
        </span>
      </div>
    );
  };

  if (monthlyTransactions.length === 0) {
    return (
      <Card className="surface-elevated shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Monthly Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No transactions this month</p>
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
            Monthly Overview - {format(selectedDate, 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyTransactions.map((transaction) => (
                  <>
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {format(new Date(transaction.date), 'MMM dd')}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        {renderCategoryCell(transaction.category)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'expense' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {transaction.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${
                          transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type === 'expense' ? '-' : '+'}₹{transaction.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTransaction(transaction.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {editingTransaction === transaction.id && (
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <TransactionEditForm
                            transaction={transaction}
                            categories={categories}
                            onSave={(updatedTransaction) => {
                              onUpdateTransaction(updatedTransaction);
                              setEditingTransaction(null);
                            }}
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
          
          <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
            <span>{monthlyTransactions.length} transactions</span>
            <div className="flex gap-4">
              <span className="text-red-600">
                Total Expenses: ₹
                {monthlyTransactions
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(2)}
              </span>
              <span className="text-green-600">
                Total Income: ₹
                {monthlyTransactions
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(2)}
              </span>
            </div>
          </div>
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
