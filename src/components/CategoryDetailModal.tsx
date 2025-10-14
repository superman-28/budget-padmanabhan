
import { useMemo, useState } from 'react';
import { X, Calendar, User, Share2, Filter, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Transaction } from '@/pages/Index';
import { format, isToday, isSameMonth, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const { toast } = useToast();
  const [filterMonth, setFilterMonth] = useState<Date | null>(null);
  const categoryTransactions = useMemo(() => {
    let filtered = transactions
      .filter(t => t.category.split(',').map(c => c.trim()).includes(categoryValue));
    
    if (filterMonth) {
      filtered = filtered.filter(t => isSameMonth(new Date(t.date), filterMonth));
    }
    
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, categoryValue, filterMonth]);

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

  const handleShareCategory = async () => {
    const shareText = `${categoryIcon} ${categoryLabel} - Summary
Total Transactions: ${categoryTransactions.length}
Total Amount: ₹${totalAmount.toFixed(2)}
Spent: ₹${totalExpenses.toFixed(2)}
Received: ₹${totalIncome.toFixed(2)}${netAmount > 0 ? `\nOwe: ₹${netAmount.toFixed(2)}` : ''}

Transactions:
${categoryTransactions.map(t => {
  const categoryCount = t.category.split(',').length;
  const allocatedAmount = t.amount / categoryCount;
  return `• ${t.description}: ${t.type === 'expense' ? '-' : '+'}₹${allocatedAmount.toFixed(2)} (${format(new Date(t.date), 'MMM d, yyyy')})`;
}).join('\n')}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${categoryLabel} Category Summary`,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard",
          description: "Category summary copied successfully",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(`${categoryIcon} ${categoryLabel}`, 14, 20);
    
    // Add summary
    doc.setFontSize(12);
    doc.text(`Total Transactions: ${categoryTransactions.length}`, 14, 35);
    doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 14, 42);
    doc.text(`Spent: ₹${totalExpenses.toFixed(2)}`, 14, 49);
    doc.text(`Received: ₹${totalIncome.toFixed(2)}`, 14, 56);
    if (netAmount > 0) {
      doc.text(`Owe: ₹${netAmount.toFixed(2)}`, 14, 63);
    }
    
    // Add transactions table
    const tableData = categoryTransactions.map(t => {
      const categoryCount = t.category.split(',').length;
      const allocatedAmount = t.amount / categoryCount;
      return [
        format(new Date(t.date), 'MMM d, yyyy'),
        t.description,
        t.paidBy || '-',
        t.type,
        `${t.type === 'expense' ? '-' : '+'}₹${allocatedAmount.toFixed(2)}`,
        categoryCount > 1 ? `₹${t.amount.toFixed(2)}` : '-'
      ];
    });
    
    autoTable(doc, {
      head: [['Date', 'Description', 'Paid By', 'Type', 'Amount', 'Total']],
      body: tableData,
      startY: netAmount > 0 ? 70 : 63,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 9 },
    });
    
    doc.save(`${categoryLabel}-transactions.pdf`);
    
    toast({
      title: "PDF exported",
      description: "Category transactions saved successfully",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl h-[90vh] sm:h-[80vh] surface-elevated flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4 flex-shrink-0">
          <CardTitle className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full" 
              style={{ backgroundColor: categoryColor }}
            />
            <span className="text-2xl">{categoryIcon}</span>
            <div>
              <h2 className="text-xl font-bold">{categoryLabel}</h2>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex flex-wrap gap-2 items-center">
                  <span>{categoryTransactions.length} transactions • ₹{totalAmount.toFixed(2)}</span>
                  {netAmount > 0 && (
                    <span className="text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded text-xs">
                      Owe: ₹{netAmount.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex gap-4">
                  <span className="text-red-600">Spent: ₹{totalExpenses.toFixed(2)}</span>
                  <span className="text-green-600">Received: ₹{totalIncome.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardTitle>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className={cn(filterMonth && "bg-accent")}>
                  <Filter className="h-4 w-4" />
                  {filterMonth && <span className="ml-1 text-xs">{format(filterMonth, 'MMM yyyy')}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={filterMonth || undefined}
                  onSelect={(date) => setFilterMonth(date ? startOfMonth(date) : null)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
                {filterMonth && (
                  <div className="p-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setFilterMonth(null)}
                    >
                      Clear Filter
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="sm" onClick={handleExportPDF}>
              <FileDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShareCategory}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-full">
            <div className="p-6">
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
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{transaction.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span>
                              {isToday(new Date(transaction.date)) 
                                ? 'Today' 
                                : format(new Date(transaction.date), 'MMM d, yyyy')
                              }
                            </span>
                            {transaction.paidBy && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {transaction.paidBy}
                                </span>
                              </>
                            )}
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
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
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
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
