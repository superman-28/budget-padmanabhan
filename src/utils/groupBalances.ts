import type {
  GroupBalance,
  GroupExpense,
  GroupMember,
  GroupParticipantInput,
  GroupParticipantShare,
  GroupSettlement,
  SplitType,
} from '@/types/group';

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;

export function calculateGroupShares(
  amount: number,
  participants: GroupParticipantInput[],
  splitType: SplitType,
): GroupParticipantShare[] {
  const totalCents = toCents(amount);
  if (totalCents <= 0 || participants.length === 0) throw new Error('Add an amount and at least one participant.');

  const rawValues = participants.map((participant) => {
    if (!Number.isFinite(participant.value) || participant.value < 0) {
      throw new Error('Share values must be zero or greater.');
    }
    return participant.value;
  });
  if (splitType === 'equal') rawValues.fill(1);
  if (rawValues.some((value) => value <= 0)) throw new Error('Each selected member needs a share greater than zero.');

  if (splitType === 'exact' && Math.abs(rawValues.reduce((sum, value) => sum + toCents(value), 0) - totalCents) > 0) {
    throw new Error('Exact shares must add up to the full expense amount.');
  }
  if (splitType === 'percentage' && Math.abs(rawValues.reduce((sum, value) => sum + value, 0) - 100) > 0.01) {
    throw new Error('Percentages must add up to 100%.');
  }

  const weights = splitType === 'exact' ? rawValues.map(toCents) : rawValues;
  const denominator = splitType === 'exact' ? totalCents : weights.reduce((sum, value) => sum + value, 0);
  const assigned = weights.map((weight) => Math.floor(totalCents * weight / denominator));
  let remainder = totalCents - assigned.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % assigned.length) {
    assigned[index] += 1;
    remainder -= 1;
  }

  return participants.map((participant, index) => ({
    uid: participant.uid,
    displayName: participant.displayName,
    owedShare: fromCents(assigned[index]),
    paidShare: 0,
  }));
}

export function calculateGroupBalances(
  members: GroupMember[],
  expenses: GroupExpense[],
  settlements: GroupSettlement[],
): GroupBalance[] {
  const balances = new Map<string, GroupBalance>();
  members.forEach((member) => balances.set(member.uid, {
    uid: member.uid,
    displayName: member.displayName,
    email: member.email,
    net: 0,
  }));

  expenses.forEach((expense) => {
    expense.participants.forEach((participant) => {
      const balance = balances.get(participant.uid);
      if (balance) balance.net += participant.paidShare - participant.owedShare;
    });
  });
  settlements.forEach((settlement) => {
    const from = balances.get(settlement.fromUid);
    const to = balances.get(settlement.toUid);
    if (from) from.net += settlement.amount;
    if (to) to.net -= settlement.amount;
  });

  return Array.from(balances.values()).map((balance) => ({
    ...balance,
    net: fromCents(toCents(balance.net)),
  }));
}

export function simplifyGroupDebts(balances: GroupBalance[]) {
  const creditors = balances.filter((balance) => balance.net > 0.009).map((balance) => ({ ...balance, remaining: toCents(balance.net) })).sort((a, b) => b.remaining - a.remaining);
  const debtors = balances.filter((balance) => balance.net < -0.009).map((balance) => ({ ...balance, remaining: toCents(Math.abs(balance.net)) })).sort((a, b) => b.remaining - a.remaining);
  const settlements: Array<{ fromUid: string; fromName: string; toUid: string; toName: string; amount: number }> = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const cents = Math.min(debtor.remaining, creditor.remaining);
    if (cents > 0) settlements.push({
      fromUid: debtor.uid, fromName: debtor.displayName,
      toUid: creditor.uid, toName: creditor.displayName,
      amount: fromCents(cents),
    });
    debtor.remaining -= cents;
    creditor.remaining -= cents;
    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }
  return settlements;
}
