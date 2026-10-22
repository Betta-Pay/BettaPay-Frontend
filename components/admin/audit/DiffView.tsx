"use client";

import { Minus, Pencil, Plus } from "lucide-react";
import { diffJson, formatDiffValue, type DiffKind } from "@/lib/audit/diff";
import type { AuditChanges } from "@/lib/audit/types";
import { cn } from "@/lib/utils";

const KIND: Record<DiffKind, { label: string; Icon: typeof Plus; row: string }> = {
  added: { label: "Added", Icon: Plus, row: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  removed: { label: "Removed", Icon: Minus, row: "bg-red-500/10 text-red-700 dark:text-red-300" },
  modified: { label: "Modified", Icon: Pencil, row: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
};

/**
 * Structured diff of an audit entry's `changes`: one row per changed field,
 * labelled added / removed / modified (icon + word, not colour alone). The raw
 * before/after JSON stays available underneath for exact inspection.
 */
export function DiffView({ changes }: { changes: AuditChanges | null }) {
  if (!changes) {
    return <p className="text-sm text-muted-foreground">No change details were recorded for this event.</p>;
  }
  const rows = diffJson(changes.before, changes.after);

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Before and after are identical.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border" aria-label="Changed fields">
          {rows.map((row) => {
            const { label, Icon, row: tone } = KIND[row.kind];
            return (
              <li key={`${row.kind}:${row.path}`} className={cn("grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 py-2 text-sm sm:grid-cols-[auto_minmax(8rem,14rem)_1fr]", tone)}>
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </span>
                <code className="break-all font-mono text-xs font-semibold">{row.path}</code>
                <span className="col-span-2 font-mono text-xs sm:col-span-1">
                  {row.kind !== "added" && (
                    <span className="line-through opacity-70" data-testid="diff-before">
                      {formatDiffValue(row.before)}
                    </span>
                  )}
                  {row.kind === "modified" && <span aria-hidden="true"> → </span>}
                  {row.kind !== "removed" && <span data-testid="diff-after">{formatDiffValue(row.after)}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw before / after JSON</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(["before", "after"] as const).map((side) => (
            <div key={side}>
              <p className="mb-1 font-semibold capitalize">{side}</p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-2 font-mono">{JSON.stringify(changes[side], null, 2) ?? "null"}</pre>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
