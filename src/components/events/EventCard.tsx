import { useMemo, useState } from 'react';
import { Calendar, Trash2, Pencil, ChevronDown, Wallet, Receipt, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TripEvent } from '@/types/event';
import { Transaction } from '@/pages/Index';
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';

interface Props {
  event: TripEvent;
  transactions: Transaction[];
  categories: Array<{ value: string; label: string; icon: string; color: string }>;
  onEdit: (e: TripEvent) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (e: TripEvent) => void;
  onDeleteTransaction: (id: string) => void;
}

export const EventCard = ({ event, transactions, categories, onEdit, onDelete, onToggleStatus, onDeleteTransaction }: Props) => {
  const [open, setOpen] = useState(false);

  const eventTxns = useMemo(
    () => transactions.filter((t) => t.eventId === event.id),
    [transactions, event.id]
  );

  const totals = useMemo(() => {
    let expense = 0, income = 0;
    for (const t of eventTxns) {
      if (t.type === 'expense') expense += t.amount; else income += t.amount;
    }
    return { expense, income, net: income - expense };
  }, [eventTxns]);

  const budgetPct = event.budget ? Math.min(100, (totals.expense / event.budget) * 100) : 0;
  const overBudget = event.budget ? totals.expense > event.budget : false;

  const getCategoryInfo = (categoryValue: string) => categories.find((c) => c.value === categoryValue) || {
    value: categoryValue, label: categoryValue, icon: '💼', color: '#6b7280',
  };

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const t of eventTxns) {
      if (t.type !== 'expense') continue;
      const cats = t.category.split(',').map((c) => c.trim()).filter(Boolean);
      const share = cats.length > 0 ? t.amount / cats.length : t.amount;
      for (const c of cats) {
        const prev = map.get(c) || { amount: 0, count: 0 };
        map.set(c, { amount: prev.amount + share, count: prev.count + 1 });
      }
    }
    return Array.from(map.entries())
      .map(([cat, v]) => ({ cat, ...v }))
      .sort((a, b) => b.amount - a.amount);
  }, [eventTxns]);

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm animate-fade-in">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left px-4 py-4 hover:bg-accent/40 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{event.name}</h3>
              <Badge variant={event.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                {event.status}
              </Badge>
            </div>
            {event.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.description}</p>}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 flex-wrap">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(event.startDate), 'MMM d, yyyy')}</span>
              {event.endDate && <span>→ {format(new Date(event.endDate), 'MMM d, yyyy')}</span>}
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-lg bg-pastel-rose px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">Spent</p>
            <p className="text-sm font-semibold text-destructive">₹{totals.expense.toFixed(0)}</p>
          </div>
          <div className="rounded-lg bg-pastel-green px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">Income</p>
            <p className="text-sm font-semibold text-success">₹{totals.income.toFixed(0)}</p>
          </div>
          <div className="rounded-lg bg-pastel-indigo px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">Txns</p>
            <p className="text-sm font-semibold">{eventTxns.length}</p>
          </div>
        </div>

        {event.budget && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Budget</span>
              <span className={cn(overBudget && 'text-destructive font-medium')}>
                ₹{totals.expense.toFixed(0)} / ₹{event.budget.toFixed(0)}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full transition-all', overBudget ? 'bg-destructive' : 'bg-primary')} style={{ width: `${budgetPct}%` }} />
            </div>
          </div>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/60 pt-3 space-y-3 animate-fade-in">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => onEdit(event)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onToggleStatus(event)}>
              {event.status === 'active' ? 'Close Event' : 'Reopen'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(event.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>

          {categoryBreakdown.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <PieChart className="h-3.5 w-3.5" /> By Category
              </div>
              <div className="space-y-1">
                {categoryBreakdown.map(({ cat, amount, count }) => {
                  const info = getCategoryInfo(cat);
                  const pct = totals.expense > 0 ? (amount / totals.expense) * 100 : 0;
                  return (
                    <div key={cat} className="p-2 rounded-lg border border-border/50" style={{ borderLeft: `3px solid ${info.color}` }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{info.icon}</span>
                          <span className="text-sm font-medium truncate">{info.label}</span>
                          <span className="text-[10px] text-muted-foreground">({count})</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-destructive">₹{amount.toFixed(0)}</p>
                          <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</p>
                        </div>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden mt-1.5">
                        <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: info.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Receipt className="h-3.5 w-3.5" /> Transactions
            </div>
            {eventTxns.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">No transactions yet. Add one from the dashboard and link it to this event.</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {eventTxns
                  .slice()
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((t) => {
                    const cat = getCategoryInfo(t.category.split(',')[0].trim());
                    return (
                      <div key={t.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 group"
                        style={{ borderLeft: `3px solid ${cat.color}` }}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-base">{cat.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{t.description}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {isToday(new Date(t.date)) ? 'Today' : format(new Date(t.date), 'MMM d')}
                              {t.paymentMode && ` • ${t.paymentMode}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <p className={cn('text-sm font-semibold', t.type === 'expense' ? 'text-destructive' : 'text-success')}>
                            {t.type === 'expense' ? '-' : '+'}₹{t.amount.toFixed(2)}
                          </p>
                          <Button variant="ghost" size="sm" onClick={() => onDeleteTransaction(t.id)}
                            className="opacity-0 group-hover:opacity-100 text-destructive h-7 w-7 p-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
