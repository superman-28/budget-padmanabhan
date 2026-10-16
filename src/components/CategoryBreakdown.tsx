import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { UserPlus, User, Users, PieChart } from 'lucide-react';
import { Transaction } from '@/pages/Index';
import { CollapsibleCard } from './CollapsibleCard';
import { CategoryDetailModal } from './CategoryDetailModal';
import { CategoryLinkDialog } from './CategoryLinkDialog';
import { userLinkingService } from '@/services/userLinkingService';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryColor } from '@/lib/categoryColors';

interface Category {
  value: string; label: string; icon: string; color: string;
}

interface CategoryBreakdownProps {
  transactions: Transaction[];
  selectedDate: Date;
  categories: Category[];
  onDeleteTransaction: (id: string) => void;
}

export const CategoryBreakdown = ({ 
  transactions, selectedDate, categories, onDeleteTransaction 
}: CategoryBreakdownProps) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ categoryValue: string; categoryLabel: string } | null>(null);
  const [linkedCategories, setLinkedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) loadLinkedCategories();
  }, [user]);

  const loadLinkedCategories = async () => {
    if (!user) return;
    try {
      const links = await userLinkingService.getOwnedCategoryLinks(user.uid);
      setLinkedCategories(new Set(links.map(link => link.categoryValue)));
    } catch (error) {
      console.error('Error loading linked categories:', error);
    }
  };

  const categoryData = useMemo(() => {
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    const monthlyTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
    });

    const categoryTotals: Record<string, { total: number; myExpenses: number; sharedExpenses: number }> = {};
    monthlyTransactions.forEach(transaction => {
      const cats = transaction.category.split(',').map(c => c.trim());
      const amountPer = transaction.amount / cats.length;
      const isMine = !transaction.paidBy || transaction.paidBy === user?.uid;
      cats.forEach(catVal => {
        if (!categoryTotals[catVal]) categoryTotals[catVal] = { total: 0, myExpenses: 0, sharedExpenses: 0 };
        categoryTotals[catVal].total += amountPer;
        if (isMine) categoryTotals[catVal].myExpenses += amountPer;
        else categoryTotals[catVal].sharedExpenses += amountPer;
      });
    });

    return Object.entries(categoryTotals)
      .map(([catValue, amounts]) => {
        const cat = categories.find(c => c.value === catValue);
        return {
          category: catValue,
          label: cat?.label || catValue,
          icon: cat?.icon || '📁',
          color: getCategoryColor(catValue),
          amount: amounts.total,
          myExpenses: amounts.myExpenses,
          sharedExpenses: amounts.sharedExpenses,
          percentage: 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, selectedDate, categories, user]);

  const total = categoryData.reduce((sum, item) => sum + item.amount, 0);
  const dataWithPercentages = categoryData.map(item => ({
    ...item, percentage: total > 0 ? (item.amount / total) * 100 : 0,
  }));

  return (
    <>
       <CollapsibleCard
        title="Category Breakdown"
        icon={<PieChart className="h-4 w-4 text-primary" />}
        defaultOpen={true}
        className="bg-card"
      >
        {dataWithPercentages.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 text-sm">No expense data for this month</p>
        ) : (
          <div className="space-y-3">
            {dataWithPercentages.map((item) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 hover:bg-accent rounded-md p-1 transition-colors"
                        onClick={() => {
                          const cat = categories.find(c => c.value === item.category);
                          if (cat) setSelectedCategory(cat);
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-base">{item.icon}</span>
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-56 p-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span>{item.icon}</span>
                          <h4 className="font-semibold text-sm">{item.label}</h4>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <div className="flex items-center gap-1"><User className="h-3 w-3 text-primary" /><span>My expenses</span></div>
                            <span className="font-medium">₹{item.myExpenses.toFixed(2)}</span>
                          </div>
                          {item.sharedExpenses > 0 && (
                            <div className="flex justify-between">
                              <div className="flex items-center gap-1"><Users className="h-3 w-3 text-success" /><span>Shared</span></div>
                              <span className="font-medium">₹{item.sharedExpenses.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="pt-1 border-t flex justify-between font-semibold">
                            <span>Total</span><span>₹{item.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold">₹{item.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                    </div>
                    {!linkedCategories.has(item.category) && (
                      <Button variant="ghost" size="sm" onClick={() => {
                        const cat = categories.find(c => c.value === item.category);
                        if (cat) setLinkDialog({ categoryValue: cat.value, categoryLabel: cat.label });
                      }} className="h-7 w-7 p-0">
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {selectedCategory && (
        <CategoryDetailModal
          categoryValue={selectedCategory.value} categoryLabel={selectedCategory.label}
          categoryIcon={selectedCategory.icon} categoryColor={selectedCategory.color}
          transactions={transactions} onClose={() => setSelectedCategory(null)}
          onDeleteTransaction={onDeleteTransaction}
        />
      )}
      {linkDialog && (
        <CategoryLinkDialog
          categoryValue={linkDialog.categoryValue} categoryLabel={linkDialog.categoryLabel}
          isOpen={true} onClose={() => { setLinkDialog(null); loadLinkedCategories(); }}
        />
      )}
    </>
  );
};
