import { LoanSummary } from '@/components/loans/LoanSummary';
import { LoanFormDialog } from '@/components/loans/LoanFormDialog';
import { LoanCard } from '@/components/loans/LoanCard';
import AuthHeader from '@/components/AuthHeader';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLoanActions } from '@/hooks/useLoanActions';

const LoanList = ({
  loans,
  emptyMessage,
  actions,
}: {
  loans: ReturnType<typeof useLoanActions>['activeLoans'];
  emptyMessage: string;
  actions: ReturnType<typeof useLoanActions>;
}) => {
  if (loans.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>;
  }
  return (
    <>
      {loans.map((loan) => (
        <LoanCard
          key={loan.id}
          loan={loan}
          onEdit={actions.startEdit}
          onDelete={actions.handleDeleteLoan}
          onAddRepayment={actions.handleAddRepayment}
          onEditRepayment={actions.handleEditRepayment}
          onDeleteRepayment={actions.handleDeleteRepayment}
          onShare={actions.handleShareLoan}
          onUnshare={actions.handleUnshareLoan}
          onExportCSV={actions.handleExportCSV}
        />
      ))}
    </>
  );
};

const Loans = () => {
  const navigate = useNavigate();
  const actions = useLoanActions();
  const {
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
  } = actions;

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="brutalist-card flex items-center gap-4 bg-card p-5">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-foreground border-t-primary" />
            <p className="font-medium">Loading your loans...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-5 sm:px-7 sm:py-8">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold">Loans</h1>
              <p className="text-caption hidden sm:block">Track money you borrowed</p>
            </div>
          </div>
          <LoanFormDialog onSubmit={actions.handleAddLoan} />
        </div>

        <LoanSummary loans={loans} />

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-4">
            <TabsTrigger value="active" className="text-xs sm:text-sm">
              Active ({activeLoans.length})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs sm:text-sm">
              Overdue ({overdueLoans.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="text-xs sm:text-sm">
              Paid ({paidLoans.length})
            </TabsTrigger>
            {sharedLoans.length > 0 && (
              <TabsTrigger value="shared" className="text-xs sm:text-sm">
                Shared ({sharedLoans.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            <LoanList loans={activeLoans} emptyMessage="No active loans" actions={actions} />
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4 mt-4">
            <LoanList loans={overdueLoans} emptyMessage="No overdue loans 🎉" actions={actions} />
          </TabsContent>

          <TabsContent value="paid" className="space-y-4 mt-4">
            <LoanList loans={paidLoans} emptyMessage="No completed loans yet" actions={actions} />
          </TabsContent>

          {sharedLoans.length > 0 && (
            <TabsContent value="shared" className="space-y-4 mt-4">
              {sharedLoans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onAddRepayment={() => {}}
                  onEditRepayment={() => {}}
                  onDeleteRepayment={() => {}}
                  onExportCSV={actions.handleExportCSV}
                  isShared
                />
              ))}
            </TabsContent>
          )}
        </Tabs>

        {/* Edit Dialog */}
        <LoanFormDialog
          onSubmit={actions.handleEditLoan}
          editLoan={editLoan}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditLoan(null);
          }}
        />
      </div>
    </AppShell>
  );
};

export default Loans;
