import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loan, Repayment } from '@/types/loan';

interface RepaymentDialogProps {
  loan: Loan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (repayment: Omit<Repayment, 'id'>) => void;
  editRepayment?: Repayment | null;
  onEditSubmit?: (repayment: Repayment) => void;
}

export const RepaymentDialog = ({
  loan,
  open,
  onOpenChange,
  onSubmit,
  editRepayment,
  onEditSubmit,
}: RepaymentDialogProps) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const isEditing = !!editRepayment;

  // Populate when editing
  useEffect(() => {
    if (editRepayment && open) {
      setAmount(editRepayment.amount.toString());
      setDate(editRepayment.date);
      setNote(editRepayment.note || '');
    } else if (!editRepayment && open) {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
    }
  }, [editRepayment, open]);

  const maxAmount = isEditing
    ? loan.remainingAmount + (editRepayment?.amount || 0)
    : loan.remainingAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const repaymentAmount = parseFloat(amount);
    if (repaymentAmount > maxAmount) return;

    if (isEditing && onEditSubmit && editRepayment) {
      onEditSubmit({ id: editRepayment.id, amount: repaymentAmount, date, note });
    } else {
      onSubmit({ amount: repaymentAmount, date, note });
    }

    setAmount('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Repayment' : 'Add Repayment'} — {loan.lenderName}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Remaining:{' '}
          <span className="font-semibold text-foreground">₹{maxAmount.toFixed(2)}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repayAmount">Amount (₹)</Label>
            <Input
              id="repayAmount"
              type="number"
              step="0.01"
              max={maxAmount}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repayDate">Date</Label>
            <Input
              id="repayDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repayNote">Note (optional)</Label>
            <Input
              id="repayNote"
              placeholder="Any note for this payment"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            {isEditing ? 'Update Repayment' : 'Record Repayment'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
