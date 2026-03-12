import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className={cn('shadow-sm overflow-hidden', className)}>
      <CardHeader
        className="cursor-pointer select-none hover:bg-accent/50 transition-colors py-4 px-5"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {icon}
            {title}
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <div
        className={cn(
          'transition-all duration-200 ease-out overflow-hidden',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <CardContent className="pt-0 px-5 pb-5">{children}</CardContent>
      </div>
    </Card>
  );
};
