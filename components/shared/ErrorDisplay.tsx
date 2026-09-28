import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';

interface ErrorDisplayProps {
  message?: string;
  errors?: Record<string, string>;
  onRetry?: () => void;
  className?: string;
  /** Overrides the retry button label ("Try Again" by default). */
  retryLabel?: string;
}

export function ErrorDisplay({
  message = "Failed to load data. Please check your connection.",
  errors,
  onRetry,
  className = "",
  retryLabel = "Try Again",
}: ErrorDisplayProps) {
  const hasFieldErrors = errors && Object.keys(errors).length > 0;

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-4 text-center rounded-lg border border-destructive/30 bg-destructive/10 ${className}`}
    >
      <div className="flex items-center justify-center gap-2 text-destructive mb-2">
        <AlertCircle className="w-5 h-5 text-destructive shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      {hasFieldErrors && (
        <ul className="list-none p-0 m-0 mt-1 space-y-1 text-xs text-destructive/80">
          {Object.entries(errors!).map(([field, errorMsg]) => (
            <li key={field}>
              <span className="font-medium">{field}:</span> {errorMsg}
            </li>
          ))}
        </ul>
      )}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs border-destructive/40 text-destructive hover:bg-destructive/20 hover:text-destructive flex items-center gap-1.5"
          onClick={onRetry}
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
