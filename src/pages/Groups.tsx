import { useEffect, useMemo, useState } from 'react';
import { format, isWithinInterval, endOfMonth, startOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { groupService } from '@/services/groupService';
import { calculateGroupBalances, simplifyGroupDebts } from '@/utils/groupBalances';
import { GroupExpenseDialog } from '@/components/groups/GroupExpenseDialog';
import type { GroupExpense, GroupInvite, GroupSettlement, RecurringGroupBill, SharedGroup } from '@/types/group';
import {
  ArrowLeftRight, CalendarDays, Check, CircleDollarSign, Home, MapPin, Pencil, Plus,
  ReceiptText, Search, Trash2, UserPlus, Users, Wallet, X,
} from 'lucide-react';

const splitOptions = [
  { value: 'equal', label: 'Equal shares' },
  { value: 'exact', label: 'Exact amounts' },
  { value: 'percentage', label: 'Percentages' },
  { value: 'shares', label: 'Weighted shares' },
] as const;

const money = (amount: number) => '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthNow = () => format(new Date(), 'yyyy-MM');

const Groups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<SharedGroup[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [settlements, setSettlements] = useState<GroupSettlement[]>([]);
  const [bills, setBills] = useState<RecurringGroupBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(monthNow());
  const [search, setSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupKind, setGroupKind] = useState<'household' | 'trip'>('household');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupBudget, setGroupBudget] = useState('');
  const [groupStart, setGroupStart] = useState('');
  const [groupEnd, setGroupEnd] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleFrom, setSettleFrom] = useState('');
  const [settleTo, setSettleTo] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GroupExpense | null>(null);
  const [editingBill, setEditingBill] = useState<RecurringGroupBill | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubGroups = groupService.subscribeToGroups(user.uid, (items) => {
      setGroups([...items].sort((a, b) => Number((b.createdAt as any)?.seconds || 0) - Number((a.createdAt as any)?.seconds || 0)));
      setLoading(false);
    });
    const unsubInvites = groupService.subscribeToInvites(user.uid, setInvites);
    return () => { unsubGroups(); unsubInvites(); };
  }, [user]);

  useEffect(() => {
    if (!activeGroupId && groups.length) setActiveGroupId(groups[0].id);
    if (activeGroupId && !groups.some((group) => group.id === activeGroupId)) setActiveGroupId(groups[0]?.id || '');
  }, [groups, activeGroupId]);

  const group = groups.find((item) => item.id === activeGroupId) || null;
  useEffect(() => {
    if (!group) {
      setExpenses([]); setSettlements([]); setBills([]);
      return;
    }
    const a = groupService.subscribeToGroupExpenses(group.id, setExpenses);
    const b = groupService.subscribeToSettlements(group.id, setSettlements);
    const c = groupService.subscribeToRecurringBills(group.id, setBills);
    return () => { a(); b(); c(); };
  }, [group?.id]);

  const balances = useMemo(() => group ? calculateGroupBalances(group.members, expenses, settlements) : [], [group, expenses, settlements]);
  const simplifications = useMemo(() => simplifyGroupDebts(balances), [balances]);
  const currentMonthExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    const date = new Date(selectedMonth + '-15T12:00:00');
    return expenses.filter((expense) => {
      const transactionDate = new Date(expense.date + 'T12:00:00');
      return isWithinInterval(transactionDate, { start: startOfMonth(date), end: endOfMonth(date) });
    });
  }, [expenses, selectedMonth]);
  const monthSpend = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const yourMonthlyShare = currentMonthExpenses.reduce((sum, expense) => sum + (expense.participants.find((item) => item.uid === user?.uid)?.owedShare || 0), 0);
  const yourBalance = balances.find((item) => item.uid === user?.uid)?.net || 0;
  const categories = Array.from(new Set(expenses.map((expense) => expense.category).filter(Boolean))).sort();
  const visibleExpenses = expenses.filter((expense) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [expense.description, expense.note, expense.paidByName, expense.category].some((value) => (value || '').toLowerCase().includes(query));
    const matchesMember = memberFilter === 'all' || expense.participants.some((participant) => participant.uid === memberFilter) || expense.paidByUid === memberFilter;
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    return matchesSearch && matchesMember && matchesCategory;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const createGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.email || !groupName.trim()) return;
    const budget = groupBudget ? Number(groupBudget) : undefined;
    if (groupBudget && (!Number.isFinite(budget) || budget! <= 0)) {
      toast({ title: 'Check group budget', description: 'Enter a budget greater than ₹0.', variant: 'destructive' });
      return;
    }
    try {
      const id = await groupService.createGroup(
        { uid: user.uid, email: user.email, displayName: user.displayName },
        { name: groupName.trim(), kind: groupKind, description: groupDescription.trim() || undefined, budget, startDate: groupStart || undefined, endDate: groupEnd || undefined }
      );
      setActiveGroupId(id); setCreateOpen(false); setActiveTab('overview');
      setGroupName(''); setGroupDescription(''); setGroupBudget(''); setGroupStart(''); setGroupEnd('');
      toast({ title: 'Group created', description: groupKind === 'trip' ? 'Invite your trip members to start sharing costs.' : 'Invite household members to start sharing costs.' });
    } catch (cause) {
      toast({ title: 'Could not create group', description: cause instanceof Error ? cause.message : 'Please try again.', variant: 'destructive' });
    }
  };

  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!group || !user || !inviteEmail.trim()) return;
    try {
      await groupService.inviteMember(group, user.displayName || user.email || 'A group member', inviteEmail);
      setInviteEmail(''); setInviteOpen(false);
      toast({ title: 'Invitation sent', description: 'They can accept it from their Groups page.' });
    } catch (cause) {
      toast({ title: 'Could not invite member', description: cause instanceof Error ? cause.message : 'Please try again.', variant: 'destructive' });
    }
  };

  const acceptInvite = async (invite: GroupInvite) => {
    if (!user?.email) return;
    try { await groupService.acceptInvite(invite, { uid: user.uid, email: user.email, displayName: user.displayName }); toast({ title: 'Group joined', description: invite.groupName + ' is ready to use.' }); }
    catch (cause) { toast({ title: 'Could not accept invitation', description: cause instanceof Error ? cause.message : 'Please try again.', variant: 'destructive' }); }
  };

  const saveExpense = async (data: Omit<GroupExpense, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (!group) return;
    if (data.id) await groupService.updateExpense(group.id, data as GroupExpense);
    else await groupService.addExpense(group.id, data);
    setEditingExpense(null);
    toast({ title: data.id ? 'Group expense updated' : 'Group expense added' });
  };

  const deleteExpense = async (expense: GroupExpense) => {
    if (!group || !user || !confirm('Delete this shared expense? Group balances will update.')) return;
    try {
      await groupService.deleteExpense(group.id, expense.id);
      toast({ title: 'Expense deleted', description: 'Group balances were recalculated.' });
    } catch (cause) { toast({ title: 'Could not delete expense', description: cause instanceof Error ? cause.message : 'Please try again.', variant: 'destructive' }); }
  };

  const saveBill = async (data: Omit<RecurringGroupBill, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (!group) return;
    if (data.id) await groupService.updateRecurringBill(group.id, data as RecurringGroupBill);
    else await groupService.addRecurringBill(group.id, data);
    setEditingBill(null);
    toast({ title: data.id ? 'Recurring rule updated' : 'Recurring bill added' });
  };

  const recordBill = async (bill: RecurringGroupBill) => {
    if (!group) return;
    try {
      await groupService.recordRecurringBill(group, bill, selectedMonth, user?.uid || '');
      toast({ title: 'Bill recorded', description: bill.name + ' has been added to this month’s group expenses.' });
    } catch (cause) { toast({ title: 'Could not record bill', description: cause instanceof Error ? cause.message : 'Please try again.', variant: 'destructive' }); }
  };

  const recordSettlement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!group || !user) return;
    const amount = Number(settleAmount);
    if (settleFrom === settleTo || !Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Check settlement details', description: 'Select two different members and enter a positive amount.', variant: 'destructive' });
      return;
    }
    const from = group.members.find((member) => member.uid === settleFrom);
    const to = group.members.find((member) => member.uid === settleTo);
    if (!from || !to) return;
    try {
      await groupService.addSettlement(group.id, { fromUid: from.uid, fromName: from.displayName, toUid: to.uid, toName: to.displayName, amount, date: format(new Date(), 'yyyy-MM-dd'), note: settleNote.trim() || undefined, createdBy: user.uid });
      setSettleOpen(false); setSettleAmount(''); setSettleNote('');
      toast({ title: 'Settlement recorded', description: 'Balances now reflect this payment. No money was moved by the app.' });
    } catch (cause) { toast({ title: 'Could not record settlement', description: cause instanceof Error ? cause.message : 'Please try again.', variant: 'destructive' }); }
  };

  const startSettlement = (fromUid: string, toUid: string, amount: number) => {
    setSettleFrom(fromUid); setSettleTo(toUid); setSettleAmount(amount.toFixed(2)); setSettleNote(''); setSettleOpen(true);
  };

  const removeMember = async (memberUid: string) => {
    if (!group || !confirm('Remove this member from the group? They will lose access to future group data.')) return;
    const balance = balances.find((item) => item.uid === memberUid);
    if (balance && Math.abs(balance.net) > 0.01) {
      toast({ title: 'Settle the balance first', description: 'This member still has an outstanding balance in the group.', variant: 'destructive' });
      return;
    }
    try {
      await groupService.removeMember(group, memberUid);
      toast({ title: 'Member removed' });
    } catch (cause) { toast({ title: 'Could not remove member', description: cause instanceof Error ? cause.message : 'Please try again.', variant: 'destructive' }); }
  };

  const recordYourShare = (expense: GroupExpense) => expense.participants.find((participant) => participant.uid === user?.uid)?.owedShare || 0;
  const canManage = Boolean(group && user && group.ownerId === user.uid);

  if (loading) return <AppShell><div className="mx-auto max-w-5xl p-8 text-sm text-muted-foreground">Loading groups…</div></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-7 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border-2 border-foreground bg-primary p-2"><Users className="h-5 w-5" /></div>
            <div><h1 className="font-display text-2xl font-bold">Groups</h1><p className="text-sm text-muted-foreground">Share household and trip costs with people you invite.</p></div>
          </div>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New group</Button>
        </div>

        {invites.length > 0 && (
          <Card className="border-2 border-primary/40">
            <CardHeader className="pb-2"><CardTitle className="text-base">Invitations ({invites.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">{invites.map((invite) => (
              <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div><p className="font-medium">{invite.groupName}</p><p className="text-xs text-muted-foreground">Invited by {invite.ownerName} · {invite.groupKind}</p></div>
                <div className="flex gap-2"><Button size="sm" onClick={() => acceptInvite(invite)}><Check className="mr-1 h-4 w-4" />Accept</Button><Button size="sm" variant="outline" onClick={() => groupService.declineInvite(invite.id).then(() => toast({ title: 'Invitation declined' }))}><X className="mr-1 h-4 w-4" />Decline</Button></div>
              </div>
            ))}</CardContent>
          </Card>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {groups.map((item) => <Button key={item.id} variant={item.id === activeGroupId ? 'default' : 'outline'} className="shrink-0" onClick={() => { setActiveGroupId(item.id); setActiveTab('overview'); }}>
            {item.kind === 'trip' ? <MapPin className="mr-2 h-4 w-4" /> : <Home className="mr-2 h-4 w-4" />}{item.name}
          </Button>)}
          {groups.length === 0 && <p className="py-3 text-sm text-muted-foreground">No groups yet. Create a household or trip group to start sharing expenses.</p>}
        </div>

        {group && (
          <>
            <Card className="border-2 border-foreground">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">{group.kind === 'trip' ? <MapPin className="h-4 w-4 text-primary" /> : <Home className="h-4 w-4 text-primary" />}<h2 className="truncate font-display text-xl font-bold">{group.name}</h2></div>
                  <p className="mt-1 text-sm text-muted-foreground">{group.description || (group.kind === 'trip' ? 'Trip group' : 'Private household group')} · {group.members.length} members · Shared only with group members</p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="mr-1.5 h-4 w-4" />Invite</Button>}
                  <Button size="sm" onClick={() => { setEditingExpense(null); setExpenseOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />Add expense</Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Group spending · {format(new Date(selectedMonth + '-15T12:00:00'), 'MMM yyyy')}</p><p className="mt-1 font-display text-xl font-bold">{money(monthSpend)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Your share this month</p><p className="mt-1 font-display text-xl font-bold">{money(yourMonthlyShare)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Your current balance</p><p className={'mt-1 font-display text-xl font-bold ' + (yourBalance >= 0 ? 'text-success' : 'text-destructive')}>{yourBalance >= 0 ? 'You are owed ' : 'You owe '}{money(Math.abs(yourBalance))}</p></CardContent></Card>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={activeTab === 'overview' ? 'default' : 'outline'} onClick={() => setActiveTab('overview')}>Overview</Button>
                <Button size="sm" variant={activeTab === 'expenses' ? 'default' : 'outline'} onClick={() => setActiveTab('expenses')}>Expenses</Button>
                <Button size="sm" variant={activeTab === 'balances' ? 'default' : 'outline'} onClick={() => setActiveTab('balances')}>Balances</Button>
                <Button size="sm" variant={activeTab === 'bills' ? 'default' : 'outline'} onClick={() => setActiveTab('bills')}>Recurring bills</Button>
                <Button size="sm" variant={activeTab === 'members' ? 'default' : 'outline'} onClick={() => setActiveTab('members')}>Members</Button>
              </div>
              <div className="w-40 space-y-1"><Label htmlFor="group-month" className="text-xs">Summary month</Label><Input id="group-month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></div>
            </div>

            {activeTab === 'overview' && (
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-4 w-4" />Recent group expenses</CardTitle></CardHeader><CardContent className="space-y-2">
                  {currentMonthExpenses.length === 0 ? <p className="text-sm text-muted-foreground">No group expenses recorded for this month.</p> : currentMonthExpenses.slice(0, 6).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between gap-3 rounded-md border p-3"><div className="min-w-0"><p className="truncate font-medium">{expense.description}</p><p className="text-xs text-muted-foreground">{format(new Date(expense.date + 'T12:00:00'), 'MMM d')} · Paid by {expense.paidByName} · {expense.category}</p></div><div className="shrink-0 text-right"><p className="font-semibold">{money(expense.amount)}</p><p className="text-xs text-muted-foreground">Your share {money(recordYourShare(expense))}</p></div></div>
                  ))}
                </CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" />Category spend</CardTitle></CardHeader><CardContent className="space-y-3">
                  {Object.entries(currentMonthExpenses.reduce<Record<string, number>>((sum, expense) => { sum[expense.category || 'uncategorized'] = (sum[expense.category || 'uncategorized'] || 0) + expense.amount; return sum; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, total]) => <div key={name} className="flex justify-between gap-2 text-sm"><span className="truncate capitalize">{name}</span><span className="shrink-0 font-medium">{money(total)}</span></div>)}
                  {currentMonthExpenses.length === 0 && <p className="text-xs text-muted-foreground">Category totals appear after expenses are added.</p>}
                </CardContent></Card>
              </div>
            )}

            {activeTab === 'expenses' && (
              <Card><CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="text-base">Group expenses ({visibleExpenses.length})</CardTitle><Button size="sm" onClick={() => { setEditingExpense(null); setExpenseOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />Add expense</Button></div></CardHeader><CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search description, notes, category…" /></div>
                  <select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="all">All members</option>{group.members.map((member) => <option key={member.uid} value={member.uid}>{member.displayName}</option>)}</select>
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                </div>
                {visibleExpenses.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No matching group expenses.</p> : <div className="space-y-2">
                  {visibleExpenses.map((expense) => <div key={expense.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0 flex-1"><p className="truncate font-medium">{expense.description}</p><p className="mt-0.5 text-xs text-muted-foreground">{format(new Date(expense.date + 'T12:00:00'), 'dd MMM yyyy')} · {expense.category} · Paid by {expense.paidByName} · {splitOptions.find((option) => option.value === expense.splitType)?.label}</p>{expense.note && <p className="mt-1 truncate text-xs text-muted-foreground">{expense.note}</p>}</div>
                    <div className="flex items-center gap-2"><div className="text-right"><p className="font-semibold">{money(expense.amount)}</p><p className="text-xs text-muted-foreground">Your share {money(recordYourShare(expense))}</p></div>
                      {(expense.createdBy === user?.uid || canManage) && <><Button variant="ghost" size="icon" aria-label="Edit expense" onClick={() => { setEditingExpense(expense); setExpenseOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label="Delete expense" onClick={() => deleteExpense(expense)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>}
                    </div>
                  </div>)}
                </div>}
              </CardContent></Card>
            )}

            {activeTab === 'balances' && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card><CardHeader className="pb-2"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">Member balances</CardTitle><Button variant="outline" size="sm" onClick={() => { setSettleFrom(group.members.find((member) => member.uid !== user?.uid)?.uid || ''); setSettleTo(user?.uid || ''); setSettleOpen(true); }}><ArrowLeftRight className="mr-1.5 h-4 w-4" />Record settlement</Button></div></CardHeader><CardContent className="space-y-2">
                  {balances.map((balance) => <div key={balance.uid} className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">{balance.displayName}{balance.uid === user?.uid ? ' (you)' : ''}</p><p className={'text-xs ' + (balance.net > 0.009 ? 'text-success' : balance.net < -0.009 ? 'text-destructive' : 'text-muted-foreground')}>{balance.net > 0.009 ? 'Is owed' : balance.net < -0.009 ? 'Owes' : 'Settled up'}</p></div><p className="font-semibold tabular-nums">{money(Math.abs(balance.net))}</p></div>)}
                  <p className="pt-1 text-xs text-muted-foreground">A positive balance means this member should receive money. Settlements only update the ledger; the app does not move money.</p>
                </CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-base">Simplified paybacks</CardTitle></CardHeader><CardContent className="space-y-2">
                  {simplifications.length === 0 ? <p className="text-sm text-muted-foreground">Everyone is settled up.</p> : simplifications.map((item, index) => <div key={index} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"><p className="text-sm"><span className="font-medium">{item.fromName}</span> pays <span className="font-medium">{item.toName}</span> <span className="font-semibold">{money(item.amount)}</span></p><Button size="sm" variant="outline" onClick={() => startSettlement(item.fromUid, item.toUid, item.amount)}>Record paid</Button></div>)}
                </CardContent></Card>
                <Card className="lg:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-base">Settlement history</CardTitle></CardHeader><CardContent className="space-y-2">
                  {settlements.length === 0 ? <p className="text-sm text-muted-foreground">No settlements recorded yet.</p> : settlements.map((settlement) => <div key={settlement.id} className="flex justify-between gap-3 rounded-md border p-3 text-sm"><span>{settlement.fromName} paid {settlement.toName}{settlement.note ? ' · ' + settlement.note : ''}</span><span className="shrink-0 font-semibold">{money(settlement.amount)}</span></div>)}
                </CardContent></Card>
              </div>
            )}

            {activeTab === 'bills' && (
              <Card><CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">Recurring group bills</CardTitle>{canManage && <Button size="sm" onClick={() => { setEditingBill(null); setBillOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />Add bill</Button>}</div></CardHeader><CardContent className="space-y-2">
                {bills.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Save rent, utilities, or subscriptions with a reusable split rule.</p> : bills.map((bill) => {
                  const recorded = expenses.some((expense) => expense.recurringBillId === bill.id && expense.recurringMonth === selectedMonth);
                  return <div key={bill.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><p className="font-medium">{bill.name}</p><p className="text-xs text-muted-foreground">₹{bill.amount.toFixed(2)} · Due day {bill.dueDay} · {splitOptions.find((option) => option.value === bill.splitType)?.label}</p></div><div className="flex items-center gap-2"><Button size="sm" variant={recorded ? 'outline' : 'default'} disabled={recorded} onClick={() => recordBill(bill)}>{recorded ? 'Recorded this month' : 'Record this month'}</Button>{canManage && <><Button size="icon" variant="ghost" aria-label="Edit recurring bill" onClick={() => { setEditingBill(bill); setBillOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Delete recurring bill" onClick={() => groupService.deleteRecurringBill(group.id, bill.id).then(() => toast({ title: 'Recurring bill deleted' }))}><Trash2 className="h-4 w-4 text-destructive" /></Button></>}</div></div>;
                })}
              </CardContent></Card>
            )}

            {activeTab === 'members' && (
              <Card><CardHeader className="pb-2"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">Members and access</CardTitle>{canManage && <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}><UserPlus className="mr-1.5 h-4 w-4" />Invite member</Button>}</div><p className="text-xs text-muted-foreground">Personal transactions stay private. Only expenses entered into this group are shared with its members.</p></CardHeader><CardContent className="divide-y">
                {group.members.map((member) => <div key={member.uid} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{member.displayName} {member.uid === user?.uid && <span className="text-xs text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{member.email} · {member.role}</p></div>{canManage && member.uid !== group.ownerId && <Button size="sm" variant="outline" onClick={() => removeMember(member.uid)}>Remove access</Button>}</div>)}
              </CardContent></Card>
            )}
          </>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent><DialogHeader><DialogTitle>Create a group</DialogTitle><DialogDescription>A private space for household or trip costs. Personal transactions remain separate.</DialogDescription></DialogHeader>
            <form onSubmit={createGroup} className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="new-group-name">Name</Label><Input id="new-group-name" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder={groupKind === 'trip' ? 'Goa trip' : 'Our household'} required /></div>
              <div className="space-y-1.5"><Label htmlFor="new-group-kind">Group type</Label><select id="new-group-kind" value={groupKind} onChange={(event) => setGroupKind(event.target.value as 'household' | 'trip')} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="household">Household</option><option value="trip">Trip</option></select></div>
              <div className="space-y-1.5"><Label htmlFor="new-group-description">Description (optional)</Label><Input id="new-group-description" value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="new-group-budget">Group budget (optional)</Label><Input id="new-group-budget" type="number" min="0" step="0.01" value={groupBudget} onChange={(event) => setGroupBudget(event.target.value)} /></div>
              {groupKind === 'trip' && <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="group-start">Start</Label><Input id="group-start" type="date" value={groupStart} onChange={(event) => setGroupStart(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="group-end">End</Label><Input id="group-end" type="date" value={groupEnd} onChange={(event) => setGroupEnd(event.target.value)} /></div></div>}
              <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit"><Plus className="mr-1.5 h-4 w-4" />Create</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent><DialogHeader><DialogTitle>Invite to {group?.name}</DialogTitle><DialogDescription>Invite an existing account by email. The invitation appears in their Groups page. Group data is only visible to accepted members.</DialogDescription></DialogHeader><form onSubmit={sendInvite} className="space-y-3"><Label htmlFor="group-invite-email">Email address</Label><Input id="group-invite-email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required /><DialogFooter><Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button><Button type="submit"><UserPlus className="mr-1.5 h-4 w-4" />Send invitation</Button></DialogFooter></form></DialogContent></Dialog>

        {group && <GroupExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} group={group} mode="expense" userId={user?.uid || ''} expense={editingExpense} onSaveExpense={saveExpense} onSaveBill={saveBill} />}
        {group && <GroupExpenseDialog open={billOpen} onOpenChange={setBillOpen} group={group} mode="bill" userId={user?.uid || ''} bill={editingBill} onSaveExpense={saveExpense} onSaveBill={saveBill} />}

        <Dialog open={settleOpen} onOpenChange={setSettleOpen}><DialogContent><DialogHeader><DialogTitle>Record settlement</DialogTitle><DialogDescription>This records a payment made outside the app. It does not move money.</DialogDescription></DialogHeader><form onSubmit={recordSettlement} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="settle-from">Paid by</Label><select id="settle-from" value={settleFrom} onChange={(event) => setSettleFrom(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{group?.members.map((member) => <option key={member.uid} value={member.uid}>{member.displayName}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="settle-to">Paid to</Label><select id="settle-to" value={settleTo} onChange={(event) => setSettleTo(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{group?.members.map((member) => <option key={member.uid} value={member.uid}>{member.displayName}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="settle-amount">Amount (₹)</Label><Input id="settle-amount" type="number" min="0.01" step="0.01" value={settleAmount} onChange={(event) => setSettleAmount(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="settle-note">Note (optional)</Label><Input id="settle-note" value={settleNote} onChange={(event) => setSettleNote(event.target.value)} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setSettleOpen(false)}>Cancel</Button><Button type="submit">Record paid</Button></DialogFooter>
        </form></DialogContent></Dialog>
      </div>
    </AppShell>
  );
};

export default Groups;
