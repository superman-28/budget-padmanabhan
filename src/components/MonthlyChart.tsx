
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Transaction } from '@/pages/Index';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isWithinInterval } from 'date-fns';

interface MonthlyChartProps {
  transactions: Transaction[];
  selectedDate: Date;
}

export const MonthlyChart = ({ transactions, selectedDate }: MonthlyChartProps) => {
  const chartData = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return days.map(day => {
      const dayTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return format(transactionDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });
      
      const expenses = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const income = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        date: format(day, 'MMM d'),
        expenses,
        income,
        net: income - expenses
      };
    });
  }, [transactions, selectedDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="surface-elevated border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <div className="space-y-1 mt-2">
            {payload.map((entry: any) => (
              <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
                {entry.dataKey === 'expenses' ? 'Expenses' :
                 entry.dataKey === 'income' ? 'Income' : 'Net'}: 
                ${entry.value.toFixed(2)}
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="surface-elevated shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Daily Overview - {format(selectedDate, 'MMMM yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[2, 2, 0, 0]} />
              <Bar dataKey="income" fill="#22c55e" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
