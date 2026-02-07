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
  Share2,
  Download,
  CalendarClock,
  Percent,
} from 'lucide-react';
import { RepaymentDialog } from './RepaymentDialog';
import { LoanShareDialog } from './LoanShareDialog';
import { EMISchedule } from './EMISchedule';
import { getNextEMIDueDate } from '@/utils/loanCalculations';
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
  onEditRepayment: (loan: Loan, repayment: Repayment) => void;
  onDeleteRepayment: (loan: Loan, repaymentId: string) => void;
  onShare?: (loan: Loan, email: string) => void;
  onUnshare?: (loan: Loan, email: string) => void;
  onExportCSV: (loan: Loan) => void;
  isShared?: boolean;
}

export const LoanCard = ({
  loan,
  onEdit,
  onDelete,
  onAddRepayment,
  onEditRepayment,
  onDeleteRepayment,
  onShare,
  onUnshare,
  onExportCSV,
  isShared = false,
}: LoanCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [repaymentOpen, setRepaymentOpen] = useState(false);
  const [editingRepayment, setEditingRepayment] = useState<Repayment | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [showEMI, setShowEMI] = useState(false);

  const effectiveTotal = loan.totalWithInterest || loan.totalAmount;
  const paidAmount = effectiveTotal - loan.remainingAmount;
  const paidPercentage = effectiveTotal > 0 ? (paidAmount / effectiveTotal) * 100 : 0;
  const isOverdue = loan.status === 'active' && isAfter(new Date(), new Date(loan.dueDate));
  const daysUntilDue = differenceInDays(new Date(loan.dueDate), new Date());
  const nextEMIDue = loan.emiEnabled ? getNextEMIDueDate(loan) : null;

  const handleEditRepaymentClick = (repayment: Repayment) => {
    setEditingRepayment(repayment);
    setRepaymentOpen(true);
  };

  const handleRepaymentDialogClose = (open: boolean) => {
    setRepaymentOpen(open);
    if (!open) setEditingRepayment(null);
  };

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
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <CardTitle className="text-base truncate">{loan.lenderName}</CardTitle>
                {getStatusBadge()}
                {isShared && (
                  <Badge variant="outline" className="text-xs">
                    Shared by {loan.ownerEmail}
                  </Badge>
                )}
              </div>
              {loan.description && (
                <p className="text-sm text-muted-foreground truncate">{loan.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isShared && (
                <>
                  {loan.status !== 'paid' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingRepayment(null);
                        setRepaymentOpen(true);
                      }}
                      title="Add repayment"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShareOpen(true)}
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(loan)} title="Edit">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Loan</AlertDialogTitle>
                        <AlertDialogDescription>
                          Delete this loan from {loan.lenderName}? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(loan.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onExportCSV(loan)}
                title="Export CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Date info */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
            <span className="text-muted-foreground">
              Borrowed: {format(new Date(loan.borrowedDate), 'MMM d, yyyy')}
            </span>
            <span className={`font-medium ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              {loan.emiEnabled && nextEMIDue ? (
                <>
                  <CalendarClock className="inline h-3.5 w-3.5 mr-1" />
                  Next EMI: {format(new Date(nextEMIDue), 'MMM d, yyyy')}
                </>
              ) : (
                <>
                  Due: {format(new Date(loan.dueDate), 'MMM d, yyyy')}
                  {isOverdue && ` (${Math.abs(daysUntilDue)}d overdue)`}
                  {!isOverdue && loan.status === 'active' && daysUntilDue <= 30 && ` (${daysUntilDue}d left)`}
                </>
              )}
            </span>
          </div>

          {/* Interest info */}
          {loan.hasInterest && loan.interestRate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Percent className="h-3 w-3" />
              <span>
                {loan.interestRate}% {loan.interestType} interest
                {loan.totalWithInterest && (
                  <> • Total: ₹{loan.totalWithInterest.toFixed(2)}</>
                )}
              </span>
            </div>
          )}

          {/* EMI info */}
          {loan.emiEnabled && loan.emiAmount && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              <span>
                EMI: ₹{loan.emiAmount.toFixed(2)} × {loan.emiCount} installments
              </span>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>₹{paidAmount.toFixed(2)} paid</span>
              <span className="font-semibold">₹{effectiveTotal.toFixed(2)}</span>
            </div>
            <Progress value={paidPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              ₹{loan.remainingAmount.toFixed(2)} remaining
            </p>
          </div>

          {/* Shared info */}
          {!isShared && loan.sharedWith && loan.sharedWith.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Shared with: {loan.sharedWith.join(', ')}
            </p>
          )}

          {/* EMI Schedule toggle */}
          {loan.emiEnabled && loan.emiCount && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setShowEMI(!showEMI)}
            >
              {showEMI ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              EMI Schedule ({loan.emiCount} installments)
            </Button>
          )}

          {showEMI && <EMISchedule loan={loan} />}

          {/* Repayments */}
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
                  <div
                    key={repayment.id}
                    className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-green-600 dark:text-green-400">
                        ₹{repayment.amount.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {format(new Date(repayment.date), 'MMM d, yyyy')}
                      </span>
                      {repayment.note && (
                        <span className="text-muted-foreground ml-2 hidden sm:inline">— {repayment.note}</span>
                      )}
                    </div>
                    {!isShared && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleEditRepaymentClick(repayment)}
                          title="Edit repayment"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => onDeleteRepayment(loan, repayment.id)}
                          title="Delete repayment"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!isShared && (
        <>
          <RepaymentDialog
            loan={loan}
            open={repaymentOpen}
            onOpenChange={handleRepaymentDialogClose}
            onSubmit={(repayment) => onAddRepayment(loan, repayment)}
            editRepayment={editingRepayment}
            onEditSubmit={(repayment) => onEditRepayment(loan, repayment)}
          />
          {onShare && onUnshare && (
            <LoanShareDialog
              loan={loan}
              open={shareOpen}
              onOpenChange={setShareOpen}
              onShare={(email) => onShare(loan, email)}
              onUnshare={(email) => onUnshare(loan, email)}
            />
          )}
        </>
      )}
    </>
  );
};
