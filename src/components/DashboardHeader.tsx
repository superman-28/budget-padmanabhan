
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

interface DashboardHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  displayName?: string | null;
}

export const DashboardHeader = ({ selectedDate, onDateChange, displayName }: DashboardHeaderProps) => {
  const greeting = displayName?.trim().split(/\s+/)[0];

  return (
    <section className="brutalist-card grid gap-5 bg-primary p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-7">
      <div className="min-w-0 space-y-2">
        <p className="brutalist-label text-foreground">YOUR MONEY, YOUR MOMENTUM</p>
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
          {greeting ? `Good to see you, ${greeting}.` : 'Your money, in focus.'}
        </h1>
        <p className="max-w-xl text-sm text-foreground/75">
          A clearer view of what came in, what went out, and where you’re headed.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="brutalist-label flex items-center gap-2 text-foreground">
          <Calendar className="h-4 w-4" /> MONTH
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-h-11 w-full justify-start bg-card sm:w-[190px]">
              {format(selectedDate, 'MMMM yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </section>
  );
};
