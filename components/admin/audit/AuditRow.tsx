"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui";
import { entityHref } from "@/lib/audit/links";
import type { AuditEntry } from "@/lib/audit/types";
import { DiffView } from "./DiffView";

export function AuditRow({ entry, defaultOpen = false }: { entry: AuditEntry; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const href = entityHref(entry.entityType, entry.entityId);
  const panelId = `audit-diff-${entry.id}`;

  return (
    <li className="rounded-xl border border-border bg-card" data-testid="audit-row">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-1 p-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="mt-0.5 inline-flex items-center gap-1 rounded-md text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
          {open ? "Hide diff" : "View diff"}
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono">{entry.action}</Badge>
            <span className="text-xs text-muted-foreground">{entry.entityType}</span>
            {href ? (
              <Link href={href} className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
                {entry.entityId}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </Link>
            ) : (
              <span className="font-mono text-xs">{entry.entityId}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
            {" · "}by {entry.actorId ?? "system"}
            {entry.ipAddress && <> · IP <span className="font-mono">{entry.ipAddress}</span></>}
          </p>
        </div>
      </div>
      {open && (
        <div id={panelId} className="border-t border-border p-3">
          <DiffView changes={entry.changes} />
        </div>
      )}
    </li>
  );
}
