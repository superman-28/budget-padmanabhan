import { Badge } from '@/components/ui/badge';
import { Loan } from '@/types/loan';
import { getEMISchedule } from '@/utils/loanCalculations';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface EMIScheduleProps {
  loan: Loan;
}

export const EMISchedule = ({ loan }: EMIScheduleProps) => {
  const schedule = getEMISchedule(loan);
  if (schedule.length === 0) return null;

  const overdueCount = schedule.filter((e) => e.status === 'overdue').length;
  const paidCount = schedule.filter((e) => e.status === 'paid').length;

  return (
    <div className="space-y-2 pt-2 border-t">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Monthly EMI Schedule</p>
        <p className="text-xs text-muted-foreground">
          {paidCount}/{schedule.length} paid
          {overdueCount > 0 && ` • ${overdueCount} overdue`}
        </p>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {schedule.map((emi) => (
          <div
            key={emi.number}
            className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-6">#{emi.number}</span>
              <span>{format(new Date(emi.dueDate), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">₹{emi.amount.toFixed(2)}</span>
              {emi.status === 'paid' && (
                <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 text-xs">
                  <CheckCircle className="h-3 w-3 mr-0.5" />
                  Paid
                </Badge>
              )}
              {emi.status === 'overdue' && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-0.5" />
                  Overdue
                </Badge>
              )}
              {emi.status === 'pending' && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-0.5" />
                  Pending
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
