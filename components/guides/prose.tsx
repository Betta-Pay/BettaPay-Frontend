import type { ReactNode } from "react";
import {
  AlertTriangle,
  Info,
  Lightbulb,
  OctagonAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CodeBlock from "@/components/guides/CodeBlock";

export { CodeBlock };

/**
 * Turn heading text into a stable, URL-safe id. The same algorithm runs in
 * GuideTOC as a fallback, so headings and TOC links always resolve to the
 * same anchor.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Typographic wrapper for guide body content. Styles raw HTML tags (p, ul, ol,
 * li, a, strong, inline code, hr, blockquote) so guide authors can write plain
 * markup and still match the design system. Block-level components (headings,
 * callouts, code blocks, steps) are provided separately below.
 */
export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-none text-[0.95rem] leading-7 text-muted-foreground",
        "[&_p]:my-4",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary/80",
        "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
        "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
        "[&_li]:pl-1 [&_li>strong]:text-foreground",
        "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em] [&_:not(pre)>code]:text-foreground",
        "[&_hr]:my-8 [&_hr]:border-border",
        "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Section heading (H2). Registers an anchor id used by the table of contents. */
export function H2({ children }: { children: string }) {
  return (
    <h2
      id={slugify(children)}
      className="scroll-mt-28 pt-10 text-2xl font-bold tracking-tight text-foreground first:pt-0"
    >
      {children}
    </h2>
  );
}

/** Sub-section heading (H3). Also registers a TOC anchor. */
export function H3({ children }: { children: string }) {
  return (
    <h3
      id={slugify(children)}
      className="scroll-mt-28 pt-6 text-lg font-semibold tracking-tight text-foreground"
    >
      {children}
    </h3>
  );
}

type CalloutVariant = "note" | "tip" | "warning" | "danger";

const calloutConfig: Record<
  CalloutVariant,
  { icon: LucideIcon; label: string; classes: string; iconClass: string }
> = {
  note: {
    icon: Info,
    label: "Note",
    classes: "border-info/30 bg-info/5",
    iconClass: "text-info",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    classes: "border-emerald-500/30 bg-emerald-500/5",
    iconClass: "text-emerald-500",
  },
  warning: {
    icon: AlertTriangle,
    label: "Watch out",
    classes: "border-warning/30 bg-warning/5",
    iconClass: "text-warning",
  },
  danger: {
    icon: OctagonAlert,
    label: "Important",
    classes: "border-destructive/30 bg-destructive/5",
    iconClass: "text-destructive",
  },
};

/** Highlighted callout box for notes, tips, pitfalls, and warnings. */
export function Callout({
  variant = "note",
  title,
  children,
}: {
  variant?: CalloutVariant;
  title?: string;
  children: ReactNode;
}) {
  const { icon: Icon, label, classes, iconClass } = calloutConfig[variant];
  return (
    <div className={cn("my-5 rounded-xl border p-4", classes)}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
        <span className="text-sm font-semibold text-foreground">
          {title ?? label}
        </span>
      </div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-foreground [&_p]:mt-2 [&_p:first-child]:mt-0">
        {children}
      </div>
    </div>
  );
}

/**
 * Numbered step for step-by-step sections. `n` is the visible step number so
 * authors control ordering explicitly (survives reordering during edits).
 */
export function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="my-6 border-l-2 border-border pl-5">
      <div className="mb-1 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {n}
        </span>
        <h3
          id={slugify(title)}
          className="scroll-mt-28 text-lg font-semibold tracking-tight text-foreground"
        >
          {title}
        </h3>
      </div>
      <div className="pl-10 text-[0.95rem] leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em] [&_:not(pre)>code]:text-foreground">
        {children}
      </div>
    </div>
  );
}

/** Simple key/value reference table used for anchors, retry schedules, etc. */
export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-2.5 text-left font-semibold text-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-2.5 align-top text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8em] [&_code]:text-foreground"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
