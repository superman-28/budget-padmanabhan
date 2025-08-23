
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { Transaction } from '@/pages/Index';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';

interface QuickStatsProps {
  transactions: Transaction[];
  selectedDate: Date;
}

export const QuickStats = ({ transactions, selectedDate }: QuickStatsProps) => {
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    
    const monthTransactions = transactions.filter(t => 
      isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
    );
    
    const totalExpenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const netAmount = totalIncome - totalExpenses;
    const transactionCount = monthTransactions.length;
    
    return {
      totalExpenses,
      totalIncome,
      netAmount,
      transactionCount
    };
  }, [transactions, selectedDate]);

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    trend, 
    colorClass 
  }: {
    icon: any;
    title: string;
    value: string;
    trend?: string;
    colorClass: string;
  }) => (
    <div className="surface-elevated rounded-lg p-6 shadow-sm interactive">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-caption">{title}</p>
          <p className={`text-title font-semibold ${colorClass}`}>{value}</p>
          {trend && (
            <p className="text-xs text-muted-foreground">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClass.includes('text-red') ? 'bg-red-50' : 
          colorClass.includes('text-green') ? 'bg-green-50' : 
          colorClass.includes('text-blue') ? 'bg-blue-50' : 'bg-gray-50'}`}>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        icon={TrendingDown}
        title="Total Expenses"
        value={`$${monthStats.totalExpenses.toFixed(2)}`}
        trend={`${monthStats.transactionCount} transactions`}
        colorClass="text-red-600"
      />
      
      <StatCard
        icon={TrendingUp}
        title="Total Income"
        value={`$${monthStats.totalIncome.toFixed(2)}`}
        colorClass="text-green-600"
      />
      
      <StatCard
        icon={DollarSign}
        title="Net Amount"
        value={`${monthStats.netAmount >= 0 ? '+' : ''}$${monthStats.netAmount.toFixed(2)}`}
        colorClass={monthStats.netAmount >= 0 ? "text-green-600" : "text-red-600"}
      />
      
      <StatCard
        icon={Target}
        title="This Month"
        value={format(selectedDate, 'MMM yyyy')}
        trend={`${monthStats.transactionCount} total entries`}
        colorClass="text-blue-600"
      />
    </div>
  );
};
