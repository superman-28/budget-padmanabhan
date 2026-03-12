import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, CreditCard, Smartphone, Banknote, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CollapsibleCard } from './CollapsibleCard';
import { useToast } from '@/hooks/use-toast';

export interface PaymentMode {
  id?: string;
  value: string;
  label: string;
  icon: string;
}

const iconOptions = [
  { icon: '📱', label: 'Phone' },
  { icon: '💳', label: 'Card' },
  { icon: '💵', label: 'Cash' },
  { icon: '🏦', label: 'Bank' },
  { icon: '📲', label: 'UPI' },
  { icon: '🪙', label: 'Wallet' },
];

interface PaymentModeManagerProps {
  paymentModes: PaymentMode[];
  onAdd: (mode: PaymentMode) => void;
  onUpdate: (oldValue: string, mode: PaymentMode) => void;
  onDelete: (value: string) => void;
}

export const PaymentModeManager = ({
  paymentModes,
  onAdd,
  onUpdate,
  onDelete,
}: PaymentModeManagerProps) => {
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('📱');
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const { toast } = useToast();

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const value = newLabel.trim().toLowerCase().replace(/\s+/g, '-');
    if (paymentModes.some((m) => m.value === value)) {
      toast({ title: 'Already exists', variant: 'destructive' });
      return;
    }
    onAdd({ value, label: newLabel.trim(), icon: newIcon });
    setNewLabel('');
    setNewIcon('📱');
    toast({ title: 'Payment mode added' });
  };

  const startEdit = (mode: PaymentMode) => {
    setEditingValue(mode.value);
    setEditLabel(mode.label);
    setEditIcon(mode.icon);
  };

  const saveEdit = (oldValue: string) => {
    if (!editLabel.trim()) return;
    const newValue = editLabel.trim().toLowerCase().replace(/\s+/g, '-');
    onUpdate(oldValue, { value: newValue, label: editLabel.trim(), icon: editIcon });
    setEditingValue(null);
  };

  return (
    <CollapsibleCard
      title="Payment Modes"
      icon={<CreditCard className="h-4 w-4 text-primary" />}
      defaultOpen={false}
    >
      <div className="space-y-3">
        {/* Add new */}
        <div className="flex gap-2 items-end">
          <div className="flex gap-1">
            {iconOptions.map((opt) => (
              <button
                key={opt.icon}
                type="button"
                onClick={() => setNewIcon(opt.icon)}
                className={`text-lg p-1 rounded transition-colors ${
                  newIcon === opt.icon ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-accent'
                }`}
              >
                {opt.icon}
              </button>
            ))}
          </div>
          <Input
            placeholder="e.g. GPay, CRED, Cash"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* List */}
        {paymentModes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No payment modes yet. Add GPay, CRED, Cash, etc.
          </p>
        ) : (
          <div className="space-y-2">
            {paymentModes.map((mode) => (
              <div
                key={mode.value}
                className="flex items-center justify-between p-2 rounded-lg bg-accent/30 border border-border/50"
              >
                {editingValue === mode.value ? (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex gap-1">
                      {iconOptions.map((opt) => (
                        <button
                          key={opt.icon}
                          type="button"
                          onClick={() => setEditIcon(opt.icon)}
                          className={`text-sm p-0.5 rounded ${
                            editIcon === opt.icon ? 'bg-primary/20 ring-1 ring-primary' : ''
                          }`}
                        >
                          {opt.icon}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="h-8 text-sm flex-1"
                    />
                    <Button size="sm" variant="ghost" onClick={() => saveEdit(mode.value)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingValue(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{mode.icon}</span>
                      <span className="text-sm font-medium">{mode.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(mode)} className="h-7 w-7 p-0">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(mode.value)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};
