
import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Transaction } from '@/pages/Index';
import { CategoryDetailModal } from './CategoryDetailModal';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface CategoryBreakdownProps {
  transactions: Transaction[];
  selectedDate: Date;
  categories: Array<{ value: string; label: string; icon: string; color: string }>;
  onDeleteTransaction: (id: string) => void;
}

export const CategoryBreakdown = ({ 
  transactions, 
  selectedDate, 
  categories,
  onDeleteTransaction
}: CategoryBreakdownProps) => {
  const [categoryDetail, setCategoryDetail] = useState<{
    value: string;
    label: string;
    icon: string;
    color: string;
  } | null>(null);

  const categoryData = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    
    const monthTransactions = transactions.filter(t => 
      isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
    );
    
    const categoryTotals: Record<string, { expenses: number; income: number }> = {};
    
    monthTransactions.forEach(t => {
      const categoryValues = t.category.split(',');
      const amountPerCategory = t.amount / categoryValues.length;
      
      categoryValues.forEach(catValue => {
        const trimmedCat = catValue.trim();
        if (!categoryTotals[trimmedCat]) {
          categoryTotals[trimmedCat] = { expenses: 0, income: 0 };
        }
        
        if (t.type === 'expense') {
          categoryTotals[trimmedCat].expenses += amountPerCategory;
        } else {
          categoryTotals[trimmedCat].income += amountPerCategory;
        }
      });
    });
    
    return Object.entries(categoryTotals)
      .map(([categoryValue, totals]) => {
        const netAmount = totals.expenses - totals.income;
        const categoryInfo = categories.find(cat => cat.value === categoryValue) || {
          value: categoryValue,
          label: categoryValue,
          icon: '📝',
          color: '#6b7280'
        };
        
        return {
          name: categoryInfo.label,
          value: netAmount,
          color: categoryInfo.color,
          categoryValue: categoryValue,
          categoryInfo: categoryInfo,
          percentage: 0
        };
      })
      .filter(item => item.value > 0) // Only show categories with net expenses
      .sort((a, b) => b.value - a.value);
  }, [transactions, selectedDate, categories]);

  const totalNetExpenses = categoryData.reduce((sum, item) => sum + item.value, 0);
  
  const dataWithPercentages = categoryData.map(item => ({
    ...item,
    percentage: totalNetExpenses > 0 ? (item.value / totalNetExpenses) * 100 : 0
  }));

  if (totalNetExpenses === 0) {
    return (
      <Card className="surface-elevated shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No net expenses this month</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="surface-elevated border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            ₹{data.value.toFixed(2)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Card className="surface-elevated shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataWithPercentages}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dataWithPercentages.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2">
              {dataWithPercentages.map((category, index) => (
                <button
                  key={index}
                  onClick={() => setCategoryDetail(category.categoryInfo)}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">₹{category.value.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </p>
                  </div>
                </button>
              ))}
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
