import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Transaction } from '@/pages/Index';
import { CollapsibleCard } from './CollapsibleCard';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

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
      
      const expenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      
      return { date: format(day, 'd'), expenses, income };
    });
  }, [transactions, selectedDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">Day {label}</p>
          <div className="space-y-1 mt-1">
            {payload.map((entry: any) => (
              <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
                {entry.dataKey === 'expenses' ? 'Expenses' : 'Income'}: ₹{entry.value.toFixed(2)}
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <CollapsibleCard
      title={`Daily Overview - ${format(selectedDate, 'MMMM yyyy')}`}
      icon={<TrendingUp className="h-4 w-4 text-primary" />}
      defaultOpen={false}
    >
      <div className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="expenses" fill="hsl(0 72% 51%)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="income" fill="hsl(142 76% 36%)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CollapsibleCard>
  );
};
