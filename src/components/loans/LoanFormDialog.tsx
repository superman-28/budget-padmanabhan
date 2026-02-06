import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { Loan } from '@/types/loan';

interface LoanFormDialogProps {
  onSubmit: (loan: Omit<Loan, 'id' | 'repayments' | 'remainingAmount' | 'status'>) => void;
  editLoan?: Loan | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const LoanFormDialog = ({ onSubmit, editLoan, open, onOpenChange }: LoanFormDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [lenderName, setLenderName] = useState(editLoan?.lenderName || '');
  const [totalAmount, setTotalAmount] = useState(editLoan?.totalAmount?.toString() || '');
  const [description, setDescription] = useState(editLoan?.description || '');
  const [borrowedDate, setBorrowedDate] = useState(
    editLoan?.borrowedDate || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(editLoan?.dueDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName || !totalAmount || !dueDate) return;

    onSubmit({
      lenderName,
      totalAmount: parseFloat(totalAmount),
      description,
      borrowedDate,
      dueDate,
    });

    if (!editLoan) {
      setLenderName('');
      setTotalAmount('');
      setDescription('');
      setBorrowedDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Loan
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editLoan ? 'Edit Loan' : 'Add New Loan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lenderName">Lender Name</Label>
            <Input
              id="lenderName"
              placeholder="Who did you borrow from?"
              value={lenderName}
              onChange={(e) => setLenderName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Amount (₹)</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this loan for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="borrowedDate">Borrowed Date</Label>
              <Input
                id="borrowedDate"
                type="date"
                value={borrowedDate}
                onChange={(e) => setBorrowedDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            {editLoan ? 'Update Loan' : 'Add Loan'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
