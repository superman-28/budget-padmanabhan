import { addMonths, differenceInDays, format } from 'date-fns';
import { InterestType, Loan } from '@/types/loan';

export function calculateCompoundEMI(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 100 / 12;
  if (r === 0 || months === 0) return principal / Math.max(months, 1);
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export function calculateTotalWithInterest(
  principal: number,
  rate: number,
  type: InterestType,
  borrowedDate: string,
  dueDate: string
): number {
  if (rate <= 0 || principal <= 0) return principal;
  const days = differenceInDays(new Date(dueDate), new Date(borrowedDate));
  const years = Math.max(days, 1) / 365;

  if (type === 'compound') {
    const months = Math.max(Math.round(days / 30.44), 1);
    const r = rate / 100 / 12;
    return principal * Math.pow(1 + r, months);
  }
  return principal + (principal * rate * years) / 100;
}

export interface EMIItem {
  number: number;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

export function getEMISchedule(loan: Loan): EMIItem[] {
  if (!loan.emiEnabled || !loan.emiCount || !loan.emiAmount) return [];

  const effectiveTotal = loan.totalWithInterest || loan.totalAmount;
  const totalPaid = effectiveTotal - loan.remainingAmount;
  const items: EMIItem[] = [];

  for (let i = 0; i < loan.emiCount; i++) {
    const dueDate = addMonths(new Date(loan.borrowedDate), i + 1);
    const coveredAmount = Math.min(totalPaid, (i + 1) * loan.emiAmount);
    const isFullyCovered = coveredAmount >= (i + 1) * loan.emiAmount;

    let status: 'paid' | 'pending' | 'overdue';
    if (isFullyCovered) {
      status = 'paid';
    } else if (dueDate < new Date()) {
      status = 'overdue';
    } else {
      status = 'pending';
    }

    items.push({
      number: i + 1,
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      amount: loan.emiAmount,
      status,
    });
  }

  return items;
}

export function getNextEMIDueDate(loan: Loan): string | null {
  const schedule = getEMISchedule(loan);
  const next = schedule.find((e) => e.status !== 'paid');
  return next?.dueDate || null;
}

export function exportLoanAsCSV(loan: Loan) {
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;

  const rows: string[][] = [
    ['Loan Details', ''],
    ['Lender', loan.lenderName],
    ['Principal Amount', `₹${loan.totalAmount.toFixed(2)}`],
  ];

  if (loan.hasInterest && loan.totalWithInterest) {
    rows.push(
      ['Total with Interest', `₹${loan.totalWithInterest.toFixed(2)}`],
      ['Interest Rate', `${loan.interestRate}%`],
      ['Interest Type', loan.interestType || 'N/A']
    );
  }

  rows.push(
    ['Remaining', `₹${loan.remainingAmount.toFixed(2)}`],
    ['Borrowed Date', loan.borrowedDate],
    ['Due Date', loan.dueDate],
    ['Status', loan.status]
  );

  if (loan.emiEnabled) {
    rows.push(
      ['EMI Amount', `₹${loan.emiAmount?.toFixed(2) || 'N/A'}`],
      ['Number of EMIs', `${loan.emiCount || 'N/A'}`]
    );
  }

  if (loan.sharedWith?.length) {
    rows.push(['Shared With', loan.sharedWith.join(', ')]);
  }

  rows.push(['', ''], ['Repayment History', ''], ['Date', 'Amount', 'Note']);

  loan.repayments
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach((r) => {
      rows.push([r.date, `₹${r.amount.toFixed(2)}`, r.note || '']);
    });

  if (loan.emiEnabled && loan.emiCount && loan.emiAmount) {
    rows.push(['', ''], ['EMI Schedule', ''], ['#', 'Due Date', 'Amount', 'Status']);
    const schedule = getEMISchedule(loan);
    schedule.forEach((e) => {
      rows.push([`${e.number}`, e.dueDate, `₹${e.amount.toFixed(2)}`, e.status]);
    });
  }

  const csv = rows.map((row) => row.map(esc).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loan-${loan.lenderName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
