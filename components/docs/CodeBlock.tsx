import { cn } from '@/lib/utils';
import { CopyButton } from './CopyButton';

interface CodeBlockProps {
  /** Raw source used for copy-to-clipboard. */
  code: string;
  /** Pre-rendered Shiki HTML (dual-theme). Produced server-side. */
  html: string;
  /** Optional language/label shown in the header bar. */
  language?: string;
  /** Optional filename shown instead of the language label. */
  filename?: string;
  className?: string;
}

/**
 * Presentational syntax-highlighted code block. Highlighting is done on the
 * server (see `lib/docs/highlight.ts`); this component only renders the markup
 * and a copy button, so it stays a shared component usable from both server and
 * client parents.
 */
export function CodeBlock({ code, html, language, filename, className }: CodeBlockProps) {
  const header = filename ?? language;

  return (
    <div className={cn('group relative overflow-hidden rounded-xl border border-border bg-card', className)}>
      {header ? (
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
          <span className="font-mono text-xs text-muted-foreground">{header}</span>
          <CopyButton value={code} label={`Copy ${header} snippet`} />
        </div>
      ) : (
        <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <CopyButton value={code} className="bg-card/80 backdrop-blur-sm" />
        </div>
      )}
      <div className="docs-code" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
