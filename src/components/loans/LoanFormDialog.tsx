import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { Loan, InterestType } from '@/types/loan';
import { calculateCompoundEMI, calculateTotalWithInterest } from '@/utils/loanCalculations';
import { addMonths, format } from 'date-fns';

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

  // Form fields
  const [lenderName, setLenderName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [borrowedDate, setBorrowedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');

  // Interest
  const [hasInterest, setHasInterest] = useState(false);
  const [interestType, setInterestType] = useState<InterestType>('simple');
  const [interestRate, setInterestRate] = useState('');

  // EMI
  const [emiEnabled, setEmiEnabled] = useState(false);
  const [emiMode, setEmiMode] = useState<'auto' | 'manual'>('auto');
  const [emiCount, setEmiCount] = useState('');
  const [emiAmountManual, setEmiAmountManual] = useState('');

  // Populate values when editing
  useEffect(() => {
    if (editLoan && isOpen) {
      setLenderName(editLoan.lenderName);
      setTotalAmount(editLoan.totalAmount.toString());
      setDescription(editLoan.description || '');
      setBorrowedDate(editLoan.borrowedDate);
      setDueDate(editLoan.dueDate);
      setHasInterest(editLoan.hasInterest || false);
      setInterestType(editLoan.interestType || 'simple');
      setInterestRate(editLoan.interestRate?.toString() || '');
      setEmiEnabled(editLoan.emiEnabled || false);
      setEmiCount(editLoan.emiCount?.toString() || '');
      setEmiAmountManual(editLoan.emiAmount?.toString() || '');
      // Infer mode: if emiAmount was manually set, use manual
      setEmiMode('auto');
    }
  }, [editLoan, isOpen]);

  // Reset form when closing without edit
  useEffect(() => {
    if (!isOpen && !editLoan) {
      setLenderName('');
      setTotalAmount('');
      setDescription('');
      setBorrowedDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setHasInterest(false);
      setInterestType('simple');
      setInterestRate('');
      setEmiEnabled(false);
      setEmiMode('auto');
      setEmiCount('');
      setEmiAmountManual('');
    }
  }, [isOpen, editLoan]);

  // Calculated values
  const calculatedTotal = useMemo(() => {
    const principal = parseFloat(totalAmount) || 0;
    if (!hasInterest || !interestRate || principal === 0) return principal;
    const rate = parseFloat(interestRate) || 0;
    if (rate === 0) return principal;

    if (emiEnabled && emiCount) {
      const months = parseInt(emiCount) || 0;
      if (months === 0) return principal;
      if (interestType === 'compound') {
        const emi = calculateCompoundEMI(principal, rate, months);
        return emi * months;
      }
      const years = months / 12;
      return principal + (principal * rate * years) / 100;
    } else if (borrowedDate && dueDate) {
      return calculateTotalWithInterest(principal, rate, interestType, borrowedDate, dueDate);
    }
    return principal;
  }, [totalAmount, hasInterest, interestRate, interestType, emiEnabled, emiCount, borrowedDate, dueDate]);

  const calculatedEMI = useMemo(() => {
    if (!emiEnabled || !emiCount) return 0;
    const months = parseInt(emiCount) || 0;
    if (months === 0) return 0;
    const principal = parseFloat(totalAmount) || 0;
    if (principal === 0) return 0;

    if (!hasInterest || !interestRate) return principal / months;
    const rate = parseFloat(interestRate) || 0;

    if (interestType === 'compound' && rate > 0) {
      return calculateCompoundEMI(principal, rate, months);
    }
    return calculatedTotal / months;
  }, [calculatedTotal, emiEnabled, emiCount, totalAmount, hasInterest, interestRate, interestType]);

  // Auto-calculate due date when EMI is enabled
  const effectiveDueDate = useMemo(() => {
    if (emiEnabled && emiCount && borrowedDate) {
      const months = parseInt(emiCount) || 0;
      if (months > 0) {
        return format(addMonths(new Date(borrowedDate), months), 'yyyy-MM-dd');
      }
    }
    return dueDate;
  }, [emiEnabled, emiCount, borrowedDate, dueDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName || !totalAmount || !effectiveDueDate) return;

    const emiAmountValue = emiEnabled
      ? emiMode === 'auto'
        ? calculatedEMI
        : parseFloat(emiAmountManual) || 0
      : undefined;

    onSubmit({
      lenderName,
      totalAmount: parseFloat(totalAmount),
      description,
      borrowedDate,
      dueDate: effectiveDueDate,
      hasInterest,
      interestRate: hasInterest ? parseFloat(interestRate) || 0 : undefined,
      interestType: hasInterest ? interestType : undefined,
      totalWithInterest: hasInterest ? calculatedTotal : undefined,
      emiEnabled: emiEnabled || undefined,
      emiAmount: emiAmountValue,
      emiCount: emiEnabled ? parseInt(emiCount) || undefined : undefined,
    });

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editLoan ? 'Edit Loan' : 'Add New Loan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
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
            <Label htmlFor="totalAmount">Principal Amount (₹)</Label>
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

          {/* Interest Section */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Interest</Label>
              <Switch checked={hasInterest} onCheckedChange={setHasInterest} />
            </div>

            {hasInterest && (
              <>
                <div className="space-y-2">
                  <Label>Interest Type</Label>
                  <Select value={interestType} onValueChange={(v) => setInterestType(v as InterestType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple Interest</SelectItem>
                      <SelectItem value="compound">Compound Interest</SelectItem>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Annual Rate (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 12"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </div>
                {calculatedTotal > 0 && parseFloat(totalAmount) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Total with interest:{' '}
                    <span className="font-semibold text-foreground">₹{calculatedTotal.toFixed(2)}</span>
                  </p>
                )}
              </>
            )}
          </div>

          {/* EMI Section */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">EMI</Label>
              <Switch checked={emiEnabled} onCheckedChange={setEmiEnabled} />
            </div>

            {emiEnabled && (
              <>
                <div className="space-y-2">
                  <Label>EMI Mode</Label>
                  <Select value={emiMode} onValueChange={(v) => setEmiMode(v as 'auto' | 'manual')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-calculate</SelectItem>
                      <SelectItem value="manual">Manual amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emiCount">Number of Installments</Label>
                  <Input
                    id="emiCount"
                    type="number"
                    min="1"
                    placeholder="e.g. 12"
                    value={emiCount}
                    onChange={(e) => setEmiCount(e.target.value)}
                    required={emiEnabled}
                  />
                </div>
                {emiMode === 'manual' ? (
                  <div className="space-y-2">
                    <Label htmlFor="emiAmountManual">EMI Amount (₹)</Label>
                    <Input
                      id="emiAmountManual"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={emiAmountManual}
                      onChange={(e) => setEmiAmountManual(e.target.value)}
                      required={emiEnabled && emiMode === 'manual'}
                    />
                  </div>
                ) : (
                  calculatedEMI > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Monthly EMI:{' '}
                      <span className="font-semibold text-foreground">₹{calculatedEMI.toFixed(2)}</span>
                    </p>
                  )
                )}
                {effectiveDueDate && (
                  <p className="text-sm text-muted-foreground">
                    Last EMI due:{' '}
                    <span className="font-semibold text-foreground">{effectiveDueDate}</span>
                  </p>
                )}
              </>
            )}
          </div>

          {/* Due Date (only when EMI is disabled) */}
          {!emiEnabled && (
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required={!emiEnabled}
              />
            </div>
          )}

          <Button type="submit" className="w-full">
            {editLoan ? 'Update Loan' : 'Add Loan'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
