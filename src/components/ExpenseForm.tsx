import { useState } from 'react';
import { Plus, DollarSign, X, Calendar, Settings, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/pages/Index';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CategoryManager } from './CategoryManager';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentMode } from './PaymentModeManager';
import { TripEvent } from '@/types/event';

interface ExpenseFormProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  categories: Array<{ value: string; label: string; icon: string; color: string }>;
  onAddCategory: (category: { value: string; label: string; icon: string; color: string }) => void;
  onUpdateCategory: (oldValue: string, newCategory: { value: string; label: string; icon: string; color: string }) => void;
  onDeleteCategory: (categoryValue: string) => void;
  paymentModes?: PaymentMode[];
  events?: TripEvent[];
}

export const ExpenseForm = ({ 
  onAddTransaction, 
  categories, 
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  paymentModes = [],
  events = [],
}: ExpenseFormProps) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [paidBy, setPaidBy] = useState(user?.email || '');
  const [paymentMode, setPaymentMode] = useState('');
  const [eventId, setEventId] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || selectedCategories.length === 0 || !date || !paidBy.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in amount, date, paid by, and select at least one category",
        variant: "destructive",
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive amount", variant: "destructive" });
      return;
    }

    const selectedDateObj = new Date(date);
    if (isNaN(selectedDateObj.getTime())) {
      toast({ title: "Invalid Date", description: "Please select a valid date", variant: "destructive" });
      return;
    }

    const selectedEvent = events.find((e) => e.id === eventId);
    onAddTransaction({
      amount: numAmount,
      category: selectedCategories.join(','),
      description: description.trim() || 'No description',
      date: selectedDateObj.toISOString(),
      type,
      paidBy: paidBy.trim(),
      paymentMode: paymentMode || undefined,
      eventId: selectedEvent?.id,
      eventName: selectedEvent?.name,
    });

    setAmount('');
    setSelectedCategories([]);
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setPaidBy(user?.email || '');
    setPaymentMode('');
    setEventId('');
    
    toast({
      title: "Transaction Added",
      description: `${type === 'expense' ? 'Expense' : 'Income'} of ₹${numAmount.toFixed(2)} recorded`,
    });
  };

  const toggleCategory = (categoryValue: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryValue) ? prev.filter(c => c !== categoryValue) : [...prev, categoryValue]
    );
  };

  if (showCategoryManager) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setShowCategoryManager(false)} className="mb-4">
          ← Back to Add Transaction
        </Button>
        <CategoryManager 
          categories={categories}
          onAddCategory={onAddCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
        />
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-primary/20 bg-pastel-violet">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Add Transaction
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowCategoryManager(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              onClick={() => setType('expense')}
              className={`flex-1 ${type === 'expense' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'outline'}
              onClick={() => setType('income')}
              className={`flex-1 ${type === 'income' ? 'bg-success hover:bg-success/90' : ''}`}
            >
              Income
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-muted-foreground">₹</span>
                <Input id="amount" type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-8" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>

          {/* Paid By */}
          <div className="space-y-1.5">
            <Label htmlFor="paidBy" className="text-xs">Paid By</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="paidBy" type="email" placeholder="Email of person who paid" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="pl-10" />
            </div>
          </div>

          {/* Event / Trip */}
          {events.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Link to Event / Trip <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {events.filter((e) => e.status === 'active').map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setEventId(eventId === ev.id ? '' : ev.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
                      eventId === ev.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background hover:bg-accent border-border'
                    }`}
                  >
                    <MapPin className="h-3 w-3" />
                    <span>{ev.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Mode */}
          {paymentModes.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Mode</Label>
              <div className="flex flex-wrap gap-2">
                {paymentModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setPaymentMode(paymentMode === mode.value ? '' : mode.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
                      paymentMode === mode.value
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background hover:bg-accent border-border'
                    }`}
                  >
                    <span>{mode.icon}</span>
                    <span>{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <div className="space-y-1.5">
            <Label className="text-xs">Categories</Label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs transition-all ${
                    selectedCategories.includes(cat.value)
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background hover:bg-accent border-border'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {selectedCategories.includes(cat.value) && <X className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">Description <span className="text-muted-foreground">(Optional)</span></Label>
            <Input id="description" placeholder="What was this for?" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add {type === 'expense' ? 'Expense' : 'Income'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
