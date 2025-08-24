
import { useState } from 'react';
import { Plus, DollarSign, X, Calendar, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/pages/Index';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CategoryManager } from './CategoryManager';

interface ExpenseFormProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  categories: Array<{ value: string; label: string; icon: string; color: string }>;
  onAddCategory: (category: { value: string; label: string; icon: string; color: string }) => void;
  onUpdateCategory: (oldValue: string, newCategory: { value: string; label: string; icon: string; color: string }) => void;
  onDeleteCategory: (categoryValue: string) => void;
}

export const ExpenseForm = ({ 
  onAddTransaction, 
  categories, 
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: ExpenseFormProps) => {
  const [amount, setAmount] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || selectedCategories.length === 0 || !date) {
      toast({
        title: "Missing Information",
        description: "Please fill in amount, date and select at least one category",
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

    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      toast({
        title: "Invalid Date",
        description: "Please select a valid date",
        variant: "destructive",
      });
      return;
    }

    onAddTransaction({
      amount: numAmount,
      category: selectedCategories.join(','),
      description: description.trim() || 'No description',
      date: selectedDate.toISOString(),
      type,
    });

    // Reset form
    setAmount('');
    setSelectedCategories([]);
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    
    toast({
      title: "Transaction Added",
      description: `${type === 'expense' ? 'Expense' : 'Income'} of ₹${numAmount.toFixed(2)} recorded successfully`,
    });
  };

  const toggleCategory = (categoryValue: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryValue)
        ? prev.filter(c => c !== categoryValue)
        : [...prev, categoryValue]
    );
  };

  if (showCategoryManager) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setShowCategoryManager(false)}
          className="mb-4"
        >
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
    <Card className="surface-elevated shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Add Transaction
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCategoryManager(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              onClick={() => setType('expense')}
              className="flex-1"
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'outline'}
              onClick={() => setType('income')}
              className="flex-1"
            >
              Income
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-muted-foreground">₹</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                    selectedCategories.includes(cat.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {selectedCategories.includes(cat.value) && (
                    <X className="h-3 w-3" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-xs text-muted-foreground">(Optional)</span></Label>
            <Input
              id="description"
              placeholder="What was this for? (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add {type === 'expense' ? 'Expense' : 'Income'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
