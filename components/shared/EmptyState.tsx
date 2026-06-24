import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="flex flex-col items-center justify-center py-8 sm:py-14 px-4 text-center">
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3 sm:mb-4">
        <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
      </div>
      <p className="text-sm sm:text-base font-semibold text-slate-800 mb-1">{title}</p>
      {description && (
        <p className="text-xs sm:text-sm text-slate-400 max-w-xs">{description}</p>
      )}
      {action && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
