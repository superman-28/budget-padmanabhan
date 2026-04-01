
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerExtra?: React.ReactNode;
}

export const CollapsibleCard = ({
  title,
  icon,
  children,
  defaultOpen = true,
  className,
  headerExtra,
}: CollapsibleCardProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-card text-card-foreground overflow-hidden',
        'shadow-sm transition-shadow duration-300 hover:shadow-md',
        'animate-fade-in',
        className
      )}
    >
      <button
        type="button"
        className="w-full cursor-pointer select-none px-4 sm:px-5 py-3.5 sm:py-4 transition-colors hover:bg-accent/40"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between text-sm sm:text-base font-semibold">
          <div className="flex items-center gap-2 text-foreground">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-300',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </div>
      </button>
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">{children}</div>
      </div>
    </div>
  );
};
