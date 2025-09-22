
import { useMemo, useState } from 'react';
import { Calendar, Edit, Eye, User, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
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
      value: categoryValue,
      label: categoryValue,
      icon: '📝',
      color: '#6b7280'
    };
  };

  const getCategoryColors = (categoryString: string) => {
    const categoryValues = categoryString.split(',').map(c => c.trim());
    return categoryValues.map(catValue => getCategoryInfo(catValue).color);
  };

  const getRowStyle = (categoryString: string) => {
    const colors = getCategoryColors(categoryString);
    if (colors.length === 1) {
      return { borderLeft: `4px solid ${colors[0]}` };
    } else {
      // Split colors horizontally instead of gradient
      const colorWidth = 100 / colors.length;
      const colorStops = colors.map((color, index) => 
        `${color} ${index * colorWidth}% ${(index + 1) * colorWidth}%`
      ).join(', ');
      
      return { 
        borderLeft: `4px solid transparent`,
        backgroundImage: `linear-gradient(90deg, ${colorStops})`,
        backgroundSize: '4px 100%',
        backgroundRepeat: 'no-repeat'
      };
    }
  };

  const renderCategoryCell = (categoryString: string, transaction: Transaction) => {
    const categoryValues = categoryString.split(',').map(c => c.trim());
    
    if (categoryValues.length === 1) {
      const category = getCategoryInfo(categoryValues[0]);
      return (
        <HoverCard>
          <HoverCardTrigger asChild>
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
          </HoverCardTrigger>
          <HoverCardContent className="w-64 p-3 bg-background/95 backdrop-blur-sm border shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{category.icon}</span>
                <h4 className="font-semibold">{category.label}</h4>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    <span>This expense</span>
                  </div>
                  <span className="font-medium">₹{transaction.amount.toFixed(2)}</span>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    {transaction.paidBy ? 'Shared expense' : 'Personal expense'}
                  </div>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    }

    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded px-2 py-1 transition-colors">
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
        </HoverCardTrigger>
        <HoverCardContent className="w-72 p-3 bg-background/95 backdrop-blur-sm border shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {categoryValues.map(catValue => getCategoryInfo(catValue.trim()).icon).join('')}
              </span>
              <h4 className="font-semibold">Multiple Categories</h4>
            </div>
            
            <div className="space-y-2">
              {categoryValues.map(catValue => {
                const category = getCategoryInfo(catValue.trim());
                const amountPerCategory = transaction.amount / categoryValues.length;
                return (
                  <div key={catValue} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm">{category.icon} {category.label}</span>
                    </div>
                    <span className="font-medium">₹{amountPerCategory.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between font-semibold text-sm">
                <span>Total</span>
                <span>₹{transaction.amount.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {transaction.paidBy ? 'Shared expense' : 'Personal expense'}
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
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
                  <TableHead>Added by</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyTransactions.map((transaction) => (
                  <>
                    <TableRow 
                      key={transaction.id}
                      style={getRowStyle(transaction.category)}
                      className="relative"
                    >
                      <TableCell className="font-medium">
                        {format(new Date(transaction.date), 'MMM dd')}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        {renderCategoryCell(transaction.category, transaction)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {transaction.paidBy && transaction.paidBy !== 'current-user' ? (
                            <>
                              <Users className="h-4 w-4 text-blue-500" />
                              <span className="text-sm text-blue-600">Shared</span>
                            </>
                          ) : (
                            <>
                              <User className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600">You</span>
                            </>
                          )}
                        </div>
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
                        <TableCell colSpan={7} className="p-0">
                          <TransactionEditForm
                            transaction={transaction}
                            categories={categories}
                            onSave={(updatedTransaction) => {
                              onUpdateTransaction(updatedTransaction);
                              setEditingTransaction(null);
                            }}
                            onDelete={(transactionId) => {
                              onDeleteTransaction(transactionId);
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
