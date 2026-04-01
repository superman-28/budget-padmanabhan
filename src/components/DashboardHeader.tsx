
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

interface DashboardHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const DashboardHeader = ({ selectedDate, onDateChange }: DashboardHeaderProps) => {
  return (
    <div className="rounded-xl border border-border/60 bg-pastel-blue p-5 sm:p-6 shadow-sm animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Finance Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your daily expenses and monitor your financial health
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Viewing:</span>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[200px] justify-start rounded-lg border-border/60 hover:bg-accent/50 transition-colors"
              >
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
      </div>
    </div>
  );
};
