"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui";
import { diffJson, formatDiffValue } from "@/lib/audit/diff";
import { useSettingsHistory } from "@/lib/settings/client";

export function SettingsHistory() {
  const { data, isLoading, error } = useSettingsHistory();

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <History className="w-5 h-5" />
            </div>
            <CardTitle className="text-base font-semibold">Settings change history</CardTitle>
          </div>
          <Link href="/audit?action=SETTINGS_UPDATE" className="text-xs font-medium text-primary hover:underline">
            Open in audit log
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">Couldn&apos;t load change history.</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No settings changes yet.</p>
        ) : (
          <ol className="space-y-3">
            {data.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium">
                  {entry.entityId}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()} · {entry.actorId ?? "unknown"}
                  </span>
                </p>
                <ul className="mt-1 space-y-0.5 font-mono text-xs">
                  {diffJson(entry.changes?.before, entry.changes?.after).map((row) => (
                    <li key={row.path}>
                      <span className="text-muted-foreground">{row.path}</span>{" "}
                      {row.kind !== "added" && <span className="text-destructive line-through">{formatDiffValue(row.before)}</span>}
                      {row.kind === "modified" && " → "}
                      {row.kind !== "removed" && <span className="text-emerald-600 dark:text-emerald-400">{formatDiffValue(row.after)}</span>}
                      <span className="sr-only"> ({row.kind})</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
