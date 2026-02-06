import { useState } from 'react';
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
}

export const RepaymentDialog = ({ loan, open, onOpenChange, onSubmit }: RepaymentDialogProps) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const repaymentAmount = parseFloat(amount);
    if (repaymentAmount > loan.remainingAmount) {
      return;
    }

    onSubmit({ amount: repaymentAmount, date, note });
    setAmount('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Repayment — {loan.lenderName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Remaining: <span className="font-semibold text-foreground">₹{loan.remainingAmount.toFixed(2)}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repayAmount">Amount (₹)</Label>
            <Input
              id="repayAmount"
              type="number"
              step="0.01"
              max={loan.remainingAmount}
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
            Record Repayment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
