
import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { UserPlus, User, Users } from 'lucide-react';
import { Transaction } from '@/pages/Index';
import { CategoryDetailModal } from './CategoryDetailModal';
import { CategoryLinkDialog } from './CategoryLinkDialog';
import { userLinkingService } from '@/services/userLinkingService';
import { useAuth } from '@/contexts/AuthContext';

interface Category {
  value: string;
  label: string;
  icon: string;
  color: string;
}

interface CategoryBreakdownProps {
  transactions: Transaction[];
  selectedDate: Date;
  categories: Category[];
  onDeleteTransaction: (id: string) => void;
}

export const CategoryBreakdown = ({ 
  transactions, 
  selectedDate, 
  categories,
  onDeleteTransaction 
}: CategoryBreakdownProps) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<{
    value: string;
    label: string;
    icon: string;
    color: string;
  } | null>(null);
  const [linkDialog, setLinkDialog] = useState<{
    categoryValue: string;
    categoryLabel: string;
  } | null>(null);
  const [linkedCategories, setLinkedCategories] = useState<Set<string>>(new Set());

  // Load linked categories when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadLinkedCategories();
    }
  }, [user]);

  const loadLinkedCategories = async () => {
    if (!user) return;
    
    try {
      // Get categories that this user has linked (as owner)
      const links = await userLinkingService.getOwnedCategoryLinks(user.uid);
      const linkedCategoryValues = new Set(links.map(link => link.categoryValue));
      setLinkedCategories(linkedCategoryValues);
    } catch (error) {
      console.error('Error loading linked categories:', error);
    }
  };

  const categoryData = useMemo(() => {
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear &&
             t.type === 'expense';
    });

    const categoryTotals: { [key: string]: { total: number; myExpenses: number; sharedExpenses: number } } = {};
    
    monthlyTransactions.forEach(transaction => {
      const transactionCategories = transaction.category.split(',').map(c => c.trim());
      const amountPerCategory = transaction.amount / transactionCategories.length;
      const isMyTransaction = !transaction.paidBy || transaction.paidBy === user?.uid;
      
      transactionCategories.forEach(categoryValue => {
        if (!categoryTotals[categoryValue]) {
          categoryTotals[categoryValue] = { total: 0, myExpenses: 0, sharedExpenses: 0 };
        }
        categoryTotals[categoryValue].total += amountPerCategory;
        if (isMyTransaction) {
          categoryTotals[categoryValue].myExpenses += amountPerCategory;
        } else {
          categoryTotals[categoryValue].sharedExpenses += amountPerCategory;
        }
      });
    });

    return Object.entries(categoryTotals)
      .map(([categoryValue, amounts]) => {
        const category = categories.find(c => c.value === categoryValue);
        return {
          category: categoryValue,
          label: category?.label || categoryValue,
          icon: category?.icon || '📁',
          color: category?.color || '#6b7280',
          amount: amounts.total,
          myExpenses: amounts.myExpenses,
          sharedExpenses: amounts.sharedExpenses,
          percentage: 0
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, selectedDate, categories, user]);

  const total = categoryData.reduce((sum, item) => sum + item.amount, 0);
  
  const dataWithPercentages = categoryData.map(item => ({
    ...item,
    percentage: total > 0 ? (item.amount / total) * 100 : 0
  }));

  const handleCategoryClick = (categoryValue: string) => {
    const category = categories.find(c => c.value === categoryValue);
    if (category) {
      setSelectedCategory(category);
    }
  };

  const handleLinkCategory = (categoryValue: string) => {
    const category = categories.find(c => c.value === categoryValue);
    if (category) {
      setLinkDialog({
        categoryValue: category.value,
        categoryLabel: category.label
      });
    }
  };

  const handleLinkDialogClose = () => {
    setLinkDialog(null);
    // Refresh linked categories after potential new link
    loadLinkedCategories();
  };

  return (
    <>
      <Card className="surface-elevated">
        <CardHeader>
          <CardTitle className="text-lg">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {dataWithPercentages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No expense data for this month</p>
          ) : (
            <div className="space-y-3">
              {dataWithPercentages.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:opacity-80 hover:bg-accent rounded-md p-1 transition-colors"
                          onClick={() => handleCategoryClick(item.category)}
                        >
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-2xl">{item.icon}</span>
                          <span className="font-medium">{item.label}</span>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64 p-3">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{item.icon}</span>
                            <h4 className="font-semibold">{item.label}</h4>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-500" />
                                <span>My expenses</span>
                              </div>
                              <span className="font-medium">₹{item.myExpenses.toFixed(2)}</span>
                            </div>
                            
                            {item.sharedExpenses > 0 && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-green-500" />
                                  <span>Shared from others</span>
                                </div>
                                <span className="font-medium">₹{item.sharedExpenses.toFixed(2)}</span>
                              </div>
                            )}
                            
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between font-semibold">
                                <span>Total</span>
                                <span>₹{item.amount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-semibold">₹{item.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                      </div>
                      {!linkedCategories.has(item.category) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLinkCategory(item.category)}
                          className="h-8 w-8 p-0"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${item.percentage}%`, 
                        backgroundColor: item.color 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCategory && (
        <CategoryDetailModal
          categoryValue={selectedCategory.value}
          categoryLabel={selectedCategory.label}
          categoryIcon={selectedCategory.icon}
          categoryColor={selectedCategory.color}
          transactions={transactions}
          onClose={() => setSelectedCategory(null)}
          onDeleteTransaction={onDeleteTransaction}
        />
      )}

      {linkDialog && (
        <CategoryLinkDialog
          categoryValue={linkDialog.categoryValue}
          categoryLabel={linkDialog.categoryLabel}
          isOpen={true}
          onClose={handleLinkDialogClose}
        />
      )}
    </>
  );
};
