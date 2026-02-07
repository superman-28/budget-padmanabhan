import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loan, Repayment } from '@/types/loan';
import { loanService } from '@/services/loanService';
import { useToast } from '@/hooks/use-toast';
import { isAfter } from 'date-fns';
import { exportLoanAsCSV } from '@/utils/loanCalculations';

export function useLoanActions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [sharedLoans, setSharedLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubLoans = loanService.subscribeToLoans(user.uid, (data) => {
      setLoans(data);
      setLoading(false);
    });

    const unsubShared = loanService.subscribeToSharedLoans(user.uid, setSharedLoans);

    return () => {
      unsubLoans();
      unsubShared();
    };
  }, [user]);

  const handleAddLoan = async (
    loanData: Omit<Loan, 'id' | 'repayments' | 'remainingAmount' | 'status'>
  ) => {
    if (!user) return;
    try {
      await loanService.addLoan(user.uid, loanData);
      toast({ title: 'Loan added', description: `Loan from ${loanData.lenderName} recorded.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to add loan.', variant: 'destructive' });
    }
  };

  const handleEditLoan = async (
    loanData: Omit<Loan, 'id' | 'repayments' | 'remainingAmount' | 'status'>
  ) => {
    if (!user || !editLoan) return;
    try {
      await loanService.updateLoan(user.uid, { ...editLoan, ...loanData });
      toast({ title: 'Loan updated' });
      setEditLoan(null);
      setEditOpen(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to update loan.', variant: 'destructive' });
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!user) return;
    try {
      await loanService.deleteLoan(user.uid, loanId);
      toast({ title: 'Loan deleted' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete loan.', variant: 'destructive' });
    }
  };

  const handleAddRepayment = async (loan: Loan, repayment: Omit<Repayment, 'id'>) => {
    if (!user) return;
    try {
      await loanService.addRepayment(user.uid, loan, repayment);
      toast({
        title: 'Repayment recorded',
        description: `₹${repayment.amount.toFixed(2)} paid to ${loan.lenderName}`,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to record repayment.', variant: 'destructive' });
    }
  };

  const handleEditRepayment = async (loan: Loan, repayment: Repayment) => {
    if (!user) return;
    try {
      await loanService.editRepayment(user.uid, loan, repayment);
      toast({ title: 'Repayment updated' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update repayment.', variant: 'destructive' });
    }
  };

  const handleDeleteRepayment = async (loan: Loan, repaymentId: string) => {
    if (!user) return;
    try {
      await loanService.deleteRepayment(user.uid, loan, repaymentId);
      toast({ title: 'Repayment removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to remove repayment.', variant: 'destructive' });
    }
  };

  const handleShareLoan = async (loan: Loan, email: string) => {
    if (!user) return;
    try {
      await loanService.shareLoan(user.uid, user.email!, loan, email);
      toast({ title: 'Loan shared', description: `Shared with ${email}` });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to share.',
        variant: 'destructive',
      });
    }
  };

  const handleUnshareLoan = async (loan: Loan, email: string) => {
    if (!user) return;
    try {
      await loanService.unshareLoan(user.uid, loan, email);
      toast({ title: 'Access removed', description: `${email} can no longer see this loan.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to remove access.', variant: 'destructive' });
    }
  };

  const handleExportCSV = (loan: Loan) => {
    exportLoanAsCSV(loan);
    toast({ title: 'Exported', description: 'Loan data downloaded as CSV.' });
  };

  const startEdit = (loan: Loan) => {
    setEditLoan(loan);
    setEditOpen(true);
  };

  const activeLoans = useMemo(
    () => loans.filter((l) => l.status === 'active' && !isAfter(new Date(), new Date(l.dueDate))),
    [loans]
  );
  const overdueLoans = useMemo(
    () => loans.filter((l) => l.status === 'active' && isAfter(new Date(), new Date(l.dueDate))),
    [loans]
  );
  const paidLoans = useMemo(() => loans.filter((l) => l.status === 'paid'), [loans]);

  return {
    loans,
    sharedLoans,
    loading,
    editLoan,
    editOpen,
    setEditOpen,
    setEditLoan,
    activeLoans,
    overdueLoans,
    paidLoans,
    handleAddLoan,
    handleEditLoan,
    handleDeleteLoan,
    handleAddRepayment,
    handleEditRepayment,
    handleDeleteRepayment,
    handleShareLoan,
    handleUnshareLoan,
    handleExportCSV,
    startEdit,
  };
}
