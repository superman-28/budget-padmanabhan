import { format } from 'date-fns';
import { TripEvent } from '@/types/event';
import { Transaction } from '@/pages/Index';

function csvEscape(v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportEventAsCSV(event: TripEvent, transactions: Transaction[]) {
  const eventTxns = transactions.filter((t) =>
    t.eventId === event.id || (event.originalEventId && t.eventId === event.originalEventId)
  );
  const expense = eventTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const income = eventTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const lines: string[] = [];
  lines.push('Event Summary');
  lines.push(`Name,${csvEscape(event.name)}`);
  if (event.description) lines.push(`Description,${csvEscape(event.description)}`);
  lines.push(`Status,${event.status}`);
  lines.push(`Start Date,${format(new Date(event.startDate), 'yyyy-MM-dd')}`);
  if (event.endDate) lines.push(`End Date,${format(new Date(event.endDate), 'yyyy-MM-dd')}`);
  if (event.budget) lines.push(`Budget (INR),${event.budget}`);
  lines.push(`Total Spent (INR),${expense.toFixed(2)}`);
  lines.push(`Total Income (INR),${income.toFixed(2)}`);
  lines.push(`Net (INR),${(income - expense).toFixed(2)}`);
  lines.push(`Transactions,${eventTxns.length}`);
  lines.push('');
  lines.push('Date,Type,Description,Category,Amount (INR),Payment Mode,Paid By');

  eventTxns
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach((t) => {
      lines.push(
        [
          format(new Date(t.date), 'yyyy-MM-dd'),
          t.type,
          csvEscape(t.description || ''),
          csvEscape(t.category || ''),
          t.amount.toFixed(2),
          csvEscape(t.paymentMode || ''),
          csvEscape(t.paidBy || ''),
        ].join(',')
      );
    });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `event-${event.name.replace(/[^a-z0-9]+/gi, '-')}-${format(new Date(), 'yyyyMMdd')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
