
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
    <div className="surface-elevated rounded-lg p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Title and Date */}
        <div className="space-y-1">
          <h1 className="text-display">Finance Tracker</h1>
          <p className="text-caption">
            Track your daily expenses and monitor your financial health
          </p>
        </div>
        
        {/* Date Picker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Viewing:</span>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start">
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
