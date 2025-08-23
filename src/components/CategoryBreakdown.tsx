
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Transaction } from '@/pages/Index';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface CategoryBreakdownProps {
  transactions: Transaction[];
  selectedDate: Date;
}

const categoryColors: Record<string, string> = {
  food: '#eab308',
  transport: '#3b82f6',
  entertainment: '#8b5cf6',
  shopping: '#ef4444',
  bills: '#22c55e',
  health: '#06b6d4',
  other: '#6b7280',
};

const categoryLabels: Record<string, string> = {
  food: 'Food & Dining',
  transport: 'Transportation',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  bills: 'Bills & Utilities',
  health: 'Healthcare',
  other: 'Other',
};

export const CategoryBreakdown = ({ transactions, selectedDate }: CategoryBreakdownProps) => {
  const categoryData = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    
    const monthExpenses = transactions.filter(t => 
      t.type === 'expense' && 
      isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
    );
    
    const categoryTotals: Record<string, number> = {};
    
    monthExpenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    
    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        name: categoryLabels[category] || category,
        value: amount,
        color: categoryColors[category] || '#6b7280',
        percentage: 0 // Will be calculated after we have the total
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, selectedDate]);

  const totalExpenses = categoryData.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate percentages
  const dataWithPercentages = categoryData.map(item => ({
    ...item,
    percentage: totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0
  }));

  if (totalExpenses === 0) {
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
            <p>No expenses this month</p>
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
            ${data.value.toFixed(2)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="surface-elevated shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Category Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Pie Chart */}
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
          
          {/* Category List */}
          <div className="space-y-2">
            {dataWithPercentages.map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm">{category.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${category.value.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
