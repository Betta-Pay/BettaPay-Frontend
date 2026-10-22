"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, History, RefreshCcw, Send, Webhook } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { EmptyState, PageHeader } from "@/components/shared";
import { DeliveryHistoryDialog } from "@/components/admin/webhooks/DeliveryHistoryDialog";
import { DlqPanel } from "@/components/admin/webhooks/DlqPanel";
import { SignaturePreview, UrlValidator } from "@/components/admin/webhooks/DevTools";
import { useNotify } from "@/lib/hooks/useNotify";
import { useReplayLatest, useSendTest, useWebhookList } from "@/lib/webhooks/client";
import type { PublicWebhookSubscription, WebhookDelivery } from "@/lib/webhooks/types";

const PAGE_SIZE = 5;

function TestStatus({ sub }: { sub: PublicWebhookSubscription }) {
  if (!sub.lastTestedAt) return <span className="text-muted-foreground">Never tested</span>;
  const ok = sub.lastTestStatus === "success";
  return (
    <div className="space-y-0.5">
      <Badge variant={ok ? "outline" : "destructive"}>
        {ok ? "Passed" : "Failed"} · {sub.lastTestStatusCode ?? "no response"}
      </Badge>
      <p className="text-xs text-muted-foreground">
        <time dateTime={sub.lastTestedAt}>{formatDistanceToNow(new Date(sub.lastTestedAt), { addSuffix: true })}</time>
      </p>
    </div>
  );
}

export default function AdminWebhooksPage() {
  const notify = useNotify();
  const [page, setPage] = useState(1);
  const [historyFor, setHistoryFor] = useState<PublicWebhookSubscription | null>(null);
  const { data, isLoading, isFetching, error, refetch } = useWebhookList(page, PAGE_SIZE);
  const sendTest = useSendTest();
  const replay = useReplayLatest();

  const report = (label: string) => ({
    onSuccess: ({ data: a }: { data: WebhookDelivery }) =>
      a.status === "delivered"
        ? notify.success(`${label} delivered: HTTP ${a.statusCode} in ${a.latencyMs} ms`)
        : notify.error(`${label} failed: ${a.error ?? `HTTP ${a.statusCode}`}${a.latencyMs !== null ? ` (${a.latencyMs} ms)` : ""}`),
    onError: (e: Error) => notify.error(e.message),
  });

  const subs = data?.data ?? [];
  const info = data?.pageInfo;
  const busy = (id: string) =>
    (sendTest.isPending && sendTest.variables === id) || (replay.isPending && replay.variables === id);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        preTitle="Platform"
        title="Webhooks"
        description="Inspect subscriptions, delivery attempts and the dead-letter queue. Test and replay actions send real signed requests."
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw aria-hidden="true" className={isFetching ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4" aria-label="Loading webhook subscriptions">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="flex items-center justify-between gap-4 p-6 text-sm text-destructive">
              <span>Couldn’t load subscriptions: {(error as Error).message}</span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : subs.length === 0 ? (
            <EmptyState icon={Webhook} title="No webhook subscriptions" description="Merchants haven’t registered any endpoints yet." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Last test</TableHead>
                    <TableHead className="text-right">Failures</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="max-w-[260px]">
                        <p className="truncate font-medium" title={s.url}>{s.url}</p>
                        <p className="font-mono text-xs text-muted-foreground">{s.id} · {s.signingSecretMasked}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {s.events.map((e) => (
                            <Badge key={e} variant="secondary" className="font-mono">{e}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell><TestStatus sub={s} /></TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.failureCount === 0 ? (
                          <span className="text-muted-foreground">0</span>
                        ) : (
                          <span className="font-medium text-destructive">
                            {s.failureCount}
                            <span className="block text-xs font-normal text-muted-foreground">{s.consecutiveFailures} in a row</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" disabled={busy(s.id)} onClick={() => sendTest.mutate(s.id, report("Test event"))} aria-label={`Send test event to ${s.url}`}>
                            <Send aria-hidden="true" /> Send test
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy(s.id) || s.deliveryCount === 0} onClick={() => replay.mutate(s.id, report("Replay"))} aria-label={`Replay latest delivery to ${s.url}`}>
                            <RefreshCcw aria-hidden="true" /> Replay latest
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setHistoryFor(s)} aria-label={`View delivery history for ${s.url}`}>
                            <History aria-hidden="true" /> History
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {info && info.total > 0 && (
            <nav aria-label="Webhook pagination" className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Page {info.page} of {info.totalPages} · {info.total} subscription{info.total === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                  <ChevronLeft aria-hidden="true" /> Prev
                </Button>
                <Button size="sm" variant="outline" disabled={!info.hasNextPage} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                  Next <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </nav>
          )}
        </CardContent>
      </Card>

      <DlqPanel />

      <div className="grid gap-6 lg:grid-cols-2">
        <UrlValidator />
        <SignaturePreview />
      </div>

      <DeliveryHistoryDialog
        subscriptionId={historyFor?.id ?? null}
        url={historyFor?.url ?? null}
        onClose={() => setHistoryFor(null)}
      />
    </div>
  );
}
