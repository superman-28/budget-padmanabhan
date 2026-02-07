import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, UserPlus } from 'lucide-react';
import { Loan } from '@/types/loan';

interface LoanShareDialogProps {
  loan: Loan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (email: string) => void;
  onUnshare: (email: string) => void;
}

export const LoanShareDialog = ({
  loan,
  open,
  onOpenChange,
  onShare,
  onUnshare,
}: LoanShareDialogProps) => {
  const [email, setEmail] = useState('');

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onShare(email.trim().toLowerCase());
    setEmail('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Loan — {loan.lenderName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Shared members can view this loan and its repayment history (read-only).
        </p>
        <form onSubmit={handleShare} className="flex gap-2">
          <Input
            placeholder="Enter email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            required
          />
          <Button type="submit" size="sm">
            <UserPlus className="h-4 w-4 mr-1" />
            Share
          </Button>
        </form>
        {loan.sharedWith && loan.sharedWith.length > 0 && (
          <div className="space-y-2">
            <Label>Shared with:</Label>
            {loan.sharedWith.map((sharedEmail) => (
              <div
                key={sharedEmail}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
              >
                <span>{sharedEmail}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => onUnshare(sharedEmail)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
