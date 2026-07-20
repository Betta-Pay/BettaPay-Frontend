import { cn } from '@/lib/utils';
import { CopyButton } from './CopyButton';

interface ResponseBlockProps {
  /** HTTP status code shown as a colored badge. */
  status: number;
  /** Pre-rendered Shiki HTML of the JSON body. */
  html: string;
  /** Raw JSON used for copy-to-clipboard. */
  code: string;
  /** Optional label next to the badge (defaults to the status reason phrase). */
  label?: string;
}

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  504: 'Gateway Timeout',
};

function statusStyles(status: number): string {
  if (status >= 200 && status < 300) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }
  if (status >= 400 && status < 500) {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }
  if (status >= 500) {
    return 'bg-destructive/10 text-destructive';
  }
  return 'bg-muted text-muted-foreground';
}

/**
 * Formatted JSON response with a status badge and copy button. Highlighting is
 * done server-side; this only renders markup (shared component).
 */
export function ResponseBlock({ status, html, code, label }: ResponseBlockProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold',
              statusStyles(status),
            )}
          >
            {status}
          </span>
          <span className="text-xs text-muted-foreground">{label ?? STATUS_TEXT[status] ?? 'Response'}</span>
        </div>
        <CopyButton value={code} label="Copy response body" />
      </div>
      <div className="docs-code" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
