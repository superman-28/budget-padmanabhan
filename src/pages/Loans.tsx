import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loan, Repayment } from '@/types/loan';
import { loanService } from '@/services/loanService';
import { LoanSummary } from '@/components/loans/LoanSummary';
import { LoanFormDialog } from '@/components/loans/LoanFormDialog';
import { LoanCard } from '@/components/loans/LoanCard';
import AuthHeader from '@/components/AuthHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isAfter } from 'date-fns';

const Loans = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribe = loanService.subscribeToLoans(user.uid, (userLoans) => {
      setLoans(userLoans);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleAddLoan = async (loanData: Omit<Loan, 'id' | 'repayments' | 'remainingAmount' | 'status'>) => {
    if (!user) return;
    try {
      await loanService.addLoan(user.uid, loanData);
      toast({ title: 'Loan added', description: `Loan from ${loanData.lenderName} recorded.` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add loan.', variant: 'destructive' });
    }
  };

  const handleEditLoan = async (loanData: Omit<Loan, 'id' | 'repayments' | 'remainingAmount' | 'status'>) => {
    if (!user || !editLoan) return;
    try {
      await loanService.updateLoan(user.uid, {
        ...editLoan,
        ...loanData,
      });
      toast({ title: 'Loan updated' });
      setEditLoan(null);
      setEditOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update loan.', variant: 'destructive' });
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!user) return;
    try {
      await loanService.deleteLoan(user.uid, loanId);
      toast({ title: 'Loan deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete loan.', variant: 'destructive' });
    }
  };

  const handleAddRepayment = async (loan: Loan, repayment: Omit<Repayment, 'id'>) => {
    if (!user) return;
    try {
      await loanService.addRepayment(user.uid, loan, repayment);
      toast({ title: 'Repayment recorded', description: `₹${repayment.amount.toFixed(2)} paid to ${loan.lenderName}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to record repayment.', variant: 'destructive' });
    }
  };

  const handleDeleteRepayment = async (loan: Loan, repaymentId: string) => {
    if (!user) return;
    try {
      await loanService.deleteRepayment(user.uid, loan, repaymentId);
      toast({ title: 'Repayment removed' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove repayment.', variant: 'destructive' });
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your loans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-headline">Loans</h1>
              <p className="text-caption">Track money you borrowed</p>
            </div>
          </div>
          <LoanFormDialog onSubmit={handleAddLoan} />
        </div>

        <LoanSummary loans={loans} />

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="active">
              Active ({activeLoans.length})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue ({overdueLoans.length})
            </TabsTrigger>
            <TabsTrigger value="paid">
              Paid ({paidLoans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {activeLoans.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active loans</p>
            ) : (
              activeLoans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onEdit={startEdit}
                  onDelete={handleDeleteLoan}
                  onAddRepayment={handleAddRepayment}
                  onDeleteRepayment={handleDeleteRepayment}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4 mt-4">
            {overdueLoans.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No overdue loans 🎉</p>
            ) : (
              overdueLoans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onEdit={startEdit}
                  onDelete={handleDeleteLoan}
                  onAddRepayment={handleAddRepayment}
                  onDeleteRepayment={handleDeleteRepayment}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="paid" className="space-y-4 mt-4">
            {paidLoans.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No completed loans yet</p>
            ) : (
              paidLoans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onEdit={startEdit}
                  onDelete={handleDeleteLoan}
                  onAddRepayment={handleAddRepayment}
                  onDeleteRepayment={handleDeleteRepayment}
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <LoanFormDialog
          onSubmit={handleEditLoan}
          editLoan={editLoan}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditLoan(null);
          }}
        />
      </div>
    </div>
  );
};

export default Loans;
