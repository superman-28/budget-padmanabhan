import { Card, CardContent } from '@/components/ui/card';
import { Loan } from '@/types/loan';
import { Wallet, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { isAfter } from 'date-fns';

interface LoanSummaryProps {
  loans: Loan[];
}

export const LoanSummary = ({ loans }: LoanSummaryProps) => {
  const totalBorrowed = loans.reduce((sum, l) => sum + l.totalAmount, 0);
  const totalRemaining = loans.reduce((sum, l) => sum + l.remainingAmount, 0);
  const totalPaid = totalBorrowed - totalRemaining;
  const activeLoans = loans.filter((l) => l.status === 'active').length;
  const overdueLoans = loans.filter(
    (l) => l.status === 'active' && isAfter(new Date(), new Date(l.dueDate))
  ).length;
  const completedLoans = loans.filter((l) => l.status === 'paid').length;

  const stats = [
    {
      label: 'Total Borrowed',
      value: `₹${totalBorrowed.toFixed(2)}`,
      icon: Wallet,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Remaining to Pay',
      value: `₹${totalRemaining.toFixed(2)}`,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
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
      bg: 'bg-green-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="slide-up">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-caption text-xs">{stat.label}</p>
              <p className="text-lg font-bold">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
