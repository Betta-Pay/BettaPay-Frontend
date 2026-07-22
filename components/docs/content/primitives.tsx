import { Info, TriangleAlert, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

// Small presentational primitives shared by every docs content section so prose,
// headings and callouts stay consistent. All pure — they render on the server.

/** Top-level section shell. `id` matches the sidebar/scroll-spy section id. */
export function SectionShell({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-b border-border pb-16 pt-12 first:pt-0 last:border-0"
    >
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {lead && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{lead}</p>}
      {children}
    </section>
  );
}

/** A sub-topic within a section. Its `id` becomes an anchor and a TOC entry. */
export function SubSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-10">
      <h3 id={id} className="scroll-mt-24 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <div className="mt-3 space-y-4">{children}</div>
    </div>
  );
}

/** Body paragraph. */
export function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-sm leading-relaxed text-muted-foreground', className)}>{children}</p>;
}

/** Inline monospace token. */
export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground">
      {children}
    </code>
  );
}

/** Ordered/unordered list wrappers with docs styling. */
export function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="ml-1 space-y-2 text-sm leading-relaxed text-muted-foreground [&>li]:relative [&>li]:pl-5 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:text-primary [&>li]:before:content-['▸']">
      {children}
    </ul>
  );
}

export function Ol({ children }: { children: React.ReactNode }) {
  return (
    <ol className="ml-5 list-decimal space-y-2 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground/70">
      {children}
    </ol>
  );
}

const CALLOUT_STYLES = {
  info: { icon: Info, cls: 'border-info/30 bg-info/5', iconCls: 'text-info' },
  warning: { icon: TriangleAlert, cls: 'border-amber-500/30 bg-amber-500/5', iconCls: 'text-amber-600 dark:text-amber-400' },
  tip: { icon: Lightbulb, cls: 'border-emerald-500/30 bg-emerald-500/5', iconCls: 'text-emerald-600 dark:text-emerald-400' },
} as const;

/** Highlighted note box — used for gotchas like the base64url JWT caveat. */
export function Callout({
  variant = 'info',
  title,
  children,
}: {
  variant?: keyof typeof CALLOUT_STYLES;
  title?: string;
  children: React.ReactNode;
}) {
  const { icon: Icon, cls, iconCls } = CALLOUT_STYLES[variant];
  return (
    <div className={cn('flex gap-3 rounded-xl border p-4', cls)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconCls)} aria-hidden="true" />
      <div className="space-y-1 text-sm leading-relaxed text-muted-foreground">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        {children}
      </div>
    </div>
  );
}
