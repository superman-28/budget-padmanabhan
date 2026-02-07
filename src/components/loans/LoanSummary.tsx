import { Card, CardContent } from '@/components/ui/card';
import { Loan } from '@/types/loan';
import { Wallet, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { isAfter } from 'date-fns';

interface LoanSummaryProps {
  loans: Loan[];
}

export const LoanSummary = ({ loans }: LoanSummaryProps) => {
  const totalToRepay = loans.reduce((sum, l) => sum + (l.totalWithInterest || l.totalAmount), 0);
  const totalRemaining = loans.reduce((sum, l) => sum + l.remainingAmount, 0);
  const overdueLoans = loans.filter(
    (l) => l.status === 'active' && isAfter(new Date(), new Date(l.dueDate))
  ).length;
  const completedLoans = loans.filter((l) => l.status === 'paid').length;

  const stats = [
    {
      label: 'Total to Repay',
      value: `₹${totalToRepay.toFixed(2)}`,
      icon: Wallet,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Remaining',
      value: `₹${totalRemaining.toFixed(2)}`,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      label: 'Overdue',
      value: overdueLoans.toString(),
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'Completed',
      value: completedLoans.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="slide-up">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-caption text-xs truncate">{stat.label}</p>
              <p className="text-sm sm:text-lg font-bold truncate">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
