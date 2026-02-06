import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loan, Repayment } from '@/types/loan';
import { format, isAfter, differenceInDays } from 'date-fns';
import {
  Edit,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react';
import { RepaymentDialog } from './RepaymentDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface LoanCardProps {
  loan: Loan;
  onEdit: (loan: Loan) => void;
  onDelete: (loanId: string) => void;
  onAddRepayment: (loan: Loan, repayment: Omit<Repayment, 'id'>) => void;
  onDeleteRepayment: (loan: Loan, repaymentId: string) => void;
}

export const LoanCard = ({
  loan,
  onEdit,
  onDelete,
  onAddRepayment,
  onDeleteRepayment,
}: LoanCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [repaymentOpen, setRepaymentOpen] = useState(false);

  const paidPercentage = ((loan.totalAmount - loan.remainingAmount) / loan.totalAmount) * 100;
  const isOverdue = loan.status === 'active' && isAfter(new Date(), new Date(loan.dueDate));
  const daysUntilDue = differenceInDays(new Date(loan.dueDate), new Date());

  const getStatusBadge = () => {
    if (loan.status === 'paid') {
      return (
      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
          <CheckCircle className="h-3 w-3 mr-1" /> Paid
        </Badge>
      );
    }
    if (isOverdue) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
        </Badge>
      );
    }
    if (daysUntilDue <= 7) {
      return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800">
          <Clock className="h-3 w-3 mr-1" /> Due soon
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" /> Active
      </Badge>
    );
  };

  return (
    <>
      <Card className={`slide-up ${isOverdue ? 'border-destructive/50' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{loan.lenderName}</CardTitle>
                {getStatusBadge()}
              </div>
              {loan.description && (
                <p className="text-sm text-muted-foreground">{loan.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {loan.status !== 'paid' && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRepaymentOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(loan)}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Loan</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this loan from {loan.lenderName}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(loan.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Borrowed: {format(new Date(loan.borrowedDate), 'MMM d, yyyy')}
            </span>
            <span className={`font-medium ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              Due: {format(new Date(loan.dueDate), 'MMM d, yyyy')}
              {isOverdue && ` (${Math.abs(daysUntilDue)}d overdue)`}
              {!isOverdue && loan.status === 'active' && daysUntilDue <= 30 && ` (${daysUntilDue}d left)`}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>₹{(loan.totalAmount - loan.remainingAmount).toFixed(2)} paid</span>
              <span className="font-semibold">₹{loan.totalAmount.toFixed(2)}</span>
            </div>
            <Progress value={paidPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              ₹{loan.remainingAmount.toFixed(2)} remaining
            </p>
          </div>

          {loan.repayments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {loan.repayments.length} repayment{loan.repayments.length !== 1 ? 's' : ''}
            </Button>
          )}

          {expanded && (
            <div className="space-y-2 pt-2 border-t">
              {loan.repayments
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((repayment) => (
                  <div key={repayment.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                    <div>
                      <span className="font-medium text-green-600 dark:text-green-400">₹{repayment.amount.toFixed(2)}</span>
                      <span className="text-muted-foreground ml-2">
                        {format(new Date(repayment.date), 'MMM d, yyyy')}
                      </span>
                      {repayment.note && (
                        <span className="text-muted-foreground ml-2">— {repayment.note}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => onDeleteRepayment(loan, repayment.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RepaymentDialog
        loan={loan}
        open={repaymentOpen}
        onOpenChange={setRepaymentOpen}
        onSubmit={(repayment) => onAddRepayment(loan, repayment)}
      />
    </>
  );
};
