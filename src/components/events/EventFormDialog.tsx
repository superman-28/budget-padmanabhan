import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { TripEvent } from '@/types/event';
import { format } from 'date-fns';

interface Props {
  onSubmit: (data: Omit<TripEvent, 'id' | 'status' | 'createdAt'>) => void;
  editEvent?: TripEvent | null;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export const EventFormDialog = ({ onSubmit, editEvent, open, onOpenChange }: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');

  useEffect(() => {
    if (editEvent) {
      setName(editEvent.name);
      setDescription(editEvent.description || '');
      setStartDate(editEvent.startDate);
      setEndDate(editEvent.endDate || '');
      setBudget(editEvent.budget?.toString() || '');
    } else if (isOpen) {
      setName(''); setDescription(''); setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(''); setBudget('');
    }
  }, [editEvent, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      startDate,
      endDate: endDate || undefined,
      budget: budget ? parseFloat(budget) : undefined,
    });
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!editEvent && (
        <DialogTrigger asChild>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Event</Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editEvent ? 'Edit Event' : 'New Event / Trip'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa Trip" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Budget (Optional)</Label>
            <Input type="number" step="0.01" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full">{editEvent ? 'Save' : 'Create Event'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
