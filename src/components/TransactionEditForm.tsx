
import { useState } from 'react';
import { Check, X, Calendar, Trash2, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Transaction } from '@/pages/Index';
import { TripEvent } from '@/types/event';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TransactionEditFormProps {
  transaction: Transaction;
  categories: Array<{ value: string; label: string; icon: string; color: string }>;
  events?: TripEvent[];
  onSave: (updatedTransaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  onCancel: () => void;
}

export const TransactionEditForm = ({ 
  transaction, 
  categories, 
  events = [],
  onSave, 
  onDelete,
  onCancel 
}: TransactionEditFormProps) => {
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    transaction.category.split(',')
  );
  const [description, setDescription] = useState(transaction.description);
  const [date, setDate] = useState(format(new Date(transaction.date), 'yyyy-MM-dd'));
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>(transaction.type);
  const [paidBy, setPaidBy] = useState(transaction.paidBy || '');
  const [eventId, setEventId] = useState<string>(transaction.eventId || '');
  const [shareWithLinkedUsers, setShareWithLinkedUsers] = useState(transaction.sharing !== 'private');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || selectedCategories.length === 0 || !date || !paidBy.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return;
    }

    const selectedEvent = events.find((ev) => ev.id === eventId);
    const updatedTransaction: Transaction = {
      ...transaction,
      amount: numAmount,
      category: selectedCategories.join(','),
      description: description.trim() || 'No description',
      date: new Date(date).toISOString(),
      type,
      paidBy: paidBy.trim(),
      eventId: selectedEvent?.id,
      eventName: selectedEvent?.name,
      sharing: shareWithLinkedUsers ? 'linked' : 'private',
    };

    onSave(updatedTransaction);
    toast({
      title: "Transaction Updated",
      description: "Transaction updated successfully",
    });
  };

  const handleDelete = () => {
    onDelete(transaction.id);
    toast({
      title: "Transaction Deleted",
      description: "Transaction deleted successfully",
    });
  };

  const toggleCategory = (categoryValue: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryValue)
        ? prev.filter(c => c !== categoryValue)
        : [...prev, categoryValue]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={type === 'expense' ? 'default' : 'outline'}
          onClick={() => setType('expense')}
          size="sm"
        >
          Expense
        </Button>
        <Button
          type="button"
          variant={type === 'income' ? 'default' : 'outline'}
          onClick={() => setType('income')}
          size="sm"
        >
          Income
        </Button>
        <Button
          type="button"
          variant={type === 'transfer' ? 'default' : 'outline'}
          onClick={() => setType('transfer')}
          size="sm"
        >
          Transfer
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="edit-amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-muted-foreground">₹</span>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-date">Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Paid By */}
      <div className="space-y-2">
        <Label htmlFor="edit-paidBy">Paid By</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="edit-paidBy"
            type="email"
            placeholder="Email of person who paid"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
        <input type="checkbox" checked={shareWithLinkedUsers} onChange={(event) => setShareWithLinkedUsers(event.target.checked)} className="mt-0.5" />
        <span><span className="font-medium">Share with linked members</span><span className="block text-xs text-muted-foreground">Includes category links and shared events.</span></span>
      </label>

      {/* Categories */}
      <div className="space-y-2">
        <Label>Categories</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => toggleCategory(cat.value)}
              className={`flex items-center gap-2 px-2 py-1 rounded-md border text-xs transition-colors ${
                selectedCategories.includes(cat.value)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <Input
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Event */}
      {events.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Event / Trip
          </Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEventId('')}
              className={`px-2 py-1 rounded-md border text-xs transition-colors ${
                !eventId ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent'
              }`}
            >
              None
            </button>
            {events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setEventId(ev.id)}
                className={`px-2 py-1 rounded-md border text-xs transition-colors ${
                  eventId === ev.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent'
                }`}
              >
                {ev.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-between">
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
        
        <Button 
          type="button" 
          size="sm" 
          variant="destructive" 
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
    </form>
  );
};
