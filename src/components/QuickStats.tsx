
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { Transaction } from '@/pages/Index';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface QuickStatsProps {
  transactions: Transaction[];
  selectedDate: Date;
}

const statStyles = [
  { bg: 'bg-pastel-rose', iconBg: 'bg-destructive/12', text: 'text-destructive', border: 'border-destructive/15' },
  { bg: 'bg-pastel-green', iconBg: 'bg-success/12', text: 'text-success', border: 'border-success/15' },
  { bg: '', iconBg: '', text: '', border: '' }, // dynamic
  { bg: 'bg-pastel-indigo', iconBg: 'bg-primary/12', text: 'text-primary', border: 'border-primary/15' },
];

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
    
    return { totalExpenses, totalIncome, netAmount, transactionCount };
  }, [transactions, selectedDate]);

  const cards = [
    {
      icon: TrendingDown,
      title: 'Total Expenses',
      value: `₹${monthStats.totalExpenses.toFixed(2)}`,
      trend: `${monthStats.transactionCount} transactions`,
      style: statStyles[0],
    },
    {
      icon: TrendingUp,
      title: 'Total Income',
      value: `₹${monthStats.totalIncome.toFixed(2)}`,
      style: statStyles[1],
    },
    {
      icon: DollarSign,
      title: 'Net Amount',
      value: `${monthStats.netAmount >= 0 ? '+' : ''}₹${monthStats.netAmount.toFixed(2)}`,
      style: monthStats.netAmount >= 0
        ? { bg: 'bg-success/8', iconBg: 'bg-success/12', text: 'text-success', border: 'border-success/15' }
        : { bg: 'bg-destructive/8', iconBg: 'bg-destructive/12', text: 'text-destructive', border: 'border-destructive/15' },
    },
    {
      icon: Target,
      title: 'This Month',
      value: format(selectedDate, 'MMM yyyy'),
      trend: `${monthStats.transactionCount} total entries`,
      style: statStyles[3],
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, i) => (
        <div
          key={card.title}
          className={cn(
            'relative rounded-xl border p-4 sm:p-5 transition-all duration-300 ease-out',
            'hover:shadow-md hover:-translate-y-0.5',
            'animate-fade-in',
            card.style.bg,
            card.style.border
          )}
          style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{card.title}</p>
              <p className={cn('text-lg sm:text-xl font-bold tracking-tight', card.style.text)}>
                {card.value}
              </p>
              {card.trend && (
                <p className="text-[11px] sm:text-xs text-muted-foreground">{card.trend}</p>
              )}
            </div>
            <div className={cn('p-2 sm:p-2.5 rounded-lg shrink-0', card.style.iconBg)}>
              <card.icon className={cn('h-4 w-4 sm:h-5 sm:w-5', card.style.text)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
