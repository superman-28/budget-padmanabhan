import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { calculateGroupShares } from '@/utils/groupBalances';
import type {
  GroupExpense,
  GroupMember,
  RecurringGroupBill,
  SharedGroup,
  SplitType,
  GroupParticipantInput,
} from '@/types/group';

interface GroupExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: SharedGroup;
  mode: 'expense' | 'bill';
  userId: string;
  expense?: GroupExpense | null;
  bill?: RecurringGroupBill | null;
  onSaveExpense: (data: Omit<GroupExpense, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onSaveBill: (data: Omit<RecurringGroupBill, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
}

const splitOptions: Array<{ value: SplitType; label: string }> = [
  { value: 'equal', label: 'Equal shares' },
  { value: 'exact', label: 'Exact amounts' },
  { value: 'percentage', label: 'Percentages' },
  { value: 'shares', label: 'Weighted shares' },
];

function defaultSplitInputs(members: GroupMember[], type: SplitType, amount: string): GroupParticipantInput[] {
  const count = Math.max(1, members.length);
  if (type === 'exact') {
    const totalCents = Math.round(Number(amount || 0) * 100);
    const baseCents = Math.floor(totalCents / count);
    let remainder = totalCents - baseCents * count;
    return members.map((member) => {
      const cents = baseCents + (remainder-- > 0 ? 1 : 0);
      return { uid: member.uid, displayName: member.displayName, value: cents / 100 };
    });
  }
  if (type === 'percentage') {
    const baseUnits = Math.floor(10000 / count);
    let remainder = 10000 - baseUnits * count;
    return members.map((member) => ({ uid: member.uid, displayName: member.displayName, value: (baseUnits + (remainder-- > 0 ? 1 : 0)) / 100 }));
  }
  return members.map((member) => ({ uid: member.uid, displayName: member.displayName, value: 1 }));
}

export const GroupExpenseDialog = ({
  open, onOpenChange, group, mode, userId, expense, bill, onSaveExpense, onSaveBill,
}: GroupExpenseDialogProps) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDay, setDueDay] = useState('1');
  const [category, setCategory] = useState('uncategorized');
  const [paidByUid, setPaidByUid] = useState(userId);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [participants, setParticipants] = useState<GroupParticipantInput[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const currentBill = mode === 'bill' ? bill : null;
    const currentExpense = mode === 'expense' ? expense : null;
    const name = currentBill?.name || currentExpense?.description || '';
    const amountValue = String(currentBill?.amount ?? currentExpense?.amount ?? '');
    const rule = currentBill?.splitType || currentExpense?.splitType || 'equal';
    const splits = currentBill?.participants || currentExpense?.splitInputs || (
      currentExpense?.participants.map((participant) => ({
        uid: participant.uid,
        displayName: participant.displayName,
        value: participant.owedShare,
      })) || defaultSplitInputs(group.members, rule, amountValue)
    );
    setDescription(name);
    setAmount(amountValue);
    setDate(currentExpense?.date || format(new Date(), 'yyyy-MM-dd'));
    setDueDay(String(currentBill?.dueDay || 1));
    setCategory(currentBill?.category || currentExpense?.category || 'uncategorized');
    setPaidByUid(currentBill?.paidByUid || currentExpense?.paidByUid || userId);
    setSplitType(rule);
    setParticipants(splits.length ? splits : defaultSplitInputs(group.members, rule, amountValue));
    setNote(currentExpense?.note || '');
    setError('');
  }, [open, mode, expense?.id, bill?.id, group.id]);

  const selectedIds = useMemo(() => new Set(participants.map((participant) => participant.uid)), [participants]);
  const toggleParticipant = (member: GroupMember) => {
    setParticipants((current) => {
      const next = current.some((item) => item.uid === member.uid)
        ? current.filter((item) => item.uid !== member.uid)
        : [...current, { uid: member.uid, displayName: member.displayName, value: 1 }];
      if (splitType === 'exact' || splitType === 'percentage') {
        const totalUnits = splitType === 'exact' ? Math.round(Number(amount || 0) * 100) : 10000;
        const baseUnits = Math.floor(totalUnits / Math.max(next.length, 1));
        let remainder = totalUnits - baseUnits * next.length;
        return next.map((item) => ({
          ...item,
          value: (baseUnits + (remainder-- > 0 ? 1 : 0)) / 100,
        }));
      }
      return next;
    });
  };

  const setSplitValue = (uid: string, value: number) => setParticipants((current) =>
    current.map((participant) => participant.uid === uid ? { ...participant, value } : participant)
  );

  const changeSplitType = (next: SplitType) => {
    setSplitType(next);
    setParticipants((current) => {
      if (next === 'exact' || next === 'percentage') {
        const totalUnits = next === 'exact' ? Math.round(Number(amount || 0) * 100) : 10000;
        const baseUnits = Math.floor(totalUnits / Math.max(current.length, 1));
        let remainder = totalUnits - baseUnits * current.length;
        return current.map((participant) => ({
          ...participant,
          value: (baseUnits + (remainder-- > 0 ? 1 : 0)) / 100,
        }));
      }
      return current.map((participant) => ({ ...participant, value: 1 }));
    });
  };

  const save = async () => {
    setError('');
    const parsedAmount = Number(amount);
    const due = Number(dueDay);
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a name and an amount greater than ₹0.');
      return;
    }
    if (!group.members.some((member) => member.uid === paidByUid)) {
      setError('Choose a current group member who paid.');
      return;
    }
    if (mode === 'expense' && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Choose a valid expense date.');
      return;
    }
    if (mode === 'bill' && (!Number.isInteger(due) || due < 1 || due > 31)) {
      setError('Choose a due day from 1 to 31.');
      return;
    }

    try {
      const shares = calculateGroupShares(parsedAmount, participants, splitType);
      const payer = group.members.find((member) => member.uid === paidByUid)!;
      const payerShare = shares.find((participant) => participant.uid === paidByUid);
      const completeShares = payerShare
        ? shares.map((participant) => participant.uid === paidByUid ? { ...participant, paidShare: parsedAmount } : participant)
        : [...shares, { uid: payer.uid, displayName: payer.displayName, paidShare: parsedAmount, owedShare: 0 }];
      setSaving(true);

      if (mode === 'expense') {
        const data = {
          ...(expense?.id ? { id: expense.id } : {}),
          description: description.trim(),
          amount: parsedAmount,
          currency: 'INR' as const,
          date,
          category: category.trim() || 'uncategorized',
          paidByUid,
          paidByName: payer.displayName,
          createdBy: expense?.createdBy || userId,
          splitType,
          participants: completeShares,
          splitInputs: participants,
          note: note.trim() || undefined,
        };
        await onSaveExpense(data);
      } else {
        const data = {
          ...(bill?.id ? { id: bill.id } : {}),
          name: description.trim(),
          amount: parsedAmount,
          currency: 'INR' as const,
          category: category.trim() || 'uncategorized',
          paidByUid,
          paidByName: payer.displayName,
          dueDay: due,
          splitType,
          participants,
          createdBy: bill?.createdBy || userId,
        };
        await onSaveBill(data);
      }
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this shared expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'bill' ? (bill ? 'Edit recurring bill' : 'Add recurring bill') : (expense ? 'Edit group expense' : 'Add group expense')}</DialogTitle>
          <DialogDescription>{mode === 'bill' ? 'Save who pays and how the bill is split. Record each month’s occurrence from the group view.' : 'Choose who paid and how each participating member shares the cost.'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="group-expense-name">{mode === 'bill' ? 'Bill name' : 'Description'}</Label>
            <Input id="group-expense-name" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={mode === 'bill' ? 'Rent' : 'Groceries'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="group-expense-amount">Amount (₹)</Label>
              <Input id="group-expense-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
            </div>
            {mode === 'expense' ? (
              <div className="space-y-1.5"><Label htmlFor="group-expense-date">Date</Label><Input id="group-expense-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
            ) : (
              <div className="space-y-1.5"><Label htmlFor="group-bill-due-day">Monthly due day</Label><Input id="group-bill-due-day" type="number" min="1" max="31" value={dueDay} onChange={(event) => setDueDay(event.target.value)} /></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="group-expense-category">Category</Label>
              <Input id="group-expense-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. rent, food" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-expense-payer">Paid by</Label>
              <select id="group-expense-payer" value={paidByUid} onChange={(event) => setPaidByUid(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {group.members.map((member) => <option key={member.uid} value={member.uid}>{member.displayName}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-split-type">Split method</Label>
            <select id="group-split-type" value={splitType} onChange={(event) => changeSplitType(event.target.value as SplitType)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {splitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <div className="rounded-md border">
              <div className="grid grid-cols-[1fr_100px] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium"><span>Included member</span><span className="text-right">{splitType === 'exact' ? 'Share ₹' : splitType === 'percentage' ? 'Percent %' : splitType === 'shares' ? 'Weight' : 'Split'}</span></div>
              {group.members.map((member) => {
                const selected = selectedIds.has(member.uid);
                const participant = participants.find((item) => item.uid === member.uid);
                return <div key={member.uid} className="grid grid-cols-[1fr_100px] items-center gap-2 border-b px-3 py-2 last:border-b-0">
                  <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={selected} onChange={() => toggleParticipant(member)} />
                    <span className="truncate">{member.displayName}</span>
                  </label>
                  {selected && splitType !== 'equal'
                    ? <Input aria-label={splitType === 'exact' ? 'Exact share' : splitType === 'percentage' ? 'Percentage share' : 'Share weight'} type="number" min="0" step={splitType === 'shares' ? '0.25' : '0.01'} value={String(participant?.value ?? '')} onChange={(event) => setSplitValue(member.uid, Number(event.target.value))} className="h-8 text-right text-xs" />
                    : <span className="text-right text-xs text-muted-foreground">{selected ? 'Included' : '—'}</span>}
                </div>;
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {splitType === 'exact' ? 'Exact shares must total the expense amount.' : splitType === 'percentage' ? 'Percentages must total 100%.' : splitType === 'shares' ? 'Weights divide the total proportionally.' : 'The amount is divided evenly among selected members.'}
            </p>
          </div>
          {mode === 'expense' && <div className="space-y-1.5"><Label htmlFor="group-expense-note">Note (optional)</Label><Input id="group-expense-note" value={note} onChange={(event) => setNote(event.target.value)} /></div>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : mode === 'bill' ? 'Save bill rule' : expense ? 'Save changes' : 'Add group expense'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
