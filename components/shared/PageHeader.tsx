import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  preTitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
}

export function PageHeader({
  title,
  description,
  preTitle,
  actions,
  className,
  titleClassName,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4", className)}>
      <div>
        {preTitle && (
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
            {preTitle}
          </p>
        )}
        <h1 className={cn("text-3xl font-bold text-foreground tracking-tight", titleClassName)}>
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
