import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-14 px-4 text-center" role="status">
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-3 sm:mb-4" aria-hidden="true">
        <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
      </div>
      <p className="text-sm sm:text-base font-semibold text-foreground mb-1">{title}</p>
      {description && (
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-primary/40 text-primary hover:bg-primary/10"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
