
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
        'brutalist-card overflow-hidden',
        'animate-fade-in',
        className
      )}
    >
      <button
        type="button"
        className="w-full cursor-pointer select-none border-b-2 border-foreground px-4 py-3.5 text-left transition-colors hover:bg-accent/40 sm:px-5 sm:py-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between gap-3 text-sm font-bold sm:text-base">
          <div className="flex min-w-0 items-center gap-2 text-foreground">
            {icon && <span className="shrink-0 text-foreground">{icon}</span>}
            <span className="truncate font-display">{title}</span>
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
