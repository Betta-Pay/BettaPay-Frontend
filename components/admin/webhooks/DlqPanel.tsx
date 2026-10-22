'use client';

import { Inbox, RotateCw } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { EmptyState } from '@/components/shared';
import { formatDistanceToNow } from 'date-fns';
import { useNotify } from '@/lib/hooks/useNotify';
import { useDlq, useRetryDlq } from '@/lib/webhooks/client';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';

export function DlqPanel() {
  const notify = useNotify();
  const { data, isLoading, error, refetch } = useDlq();
  const retry = useRetryDlq();

  const onRetry = (id: string) =>
    retry.mutate(id, {
      onSuccess: ({ data: attempt, resolved }) =>
        resolved
          ? notify.success(`Retry delivered (HTTP ${attempt.statusCode}, ${attempt.latencyMs} ms). Removed from the queue.`)
          : notify.error(`Retry failed: ${attempt.error ?? `HTTP ${attempt.statusCode}`}. Still in the queue.`),
      onError: (e) => notify.error(e.message),
    });

  return (
    <Card aria-labelledby="dlq-heading">
      <CardHeader>
        <CardTitle id="dlq-heading" className="text-base">
          Dead-letter queue {data ? <span className="text-muted-foreground">({data.total})</span> : null}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Events that exhausted their automatic retries. Retry sends a fresh signed attempt.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : error ? (
          <div role="alert" className="flex items-center justify-between text-sm text-destructive">
            {(error as Error).message}
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !data?.data.length ? (
          <EmptyState icon={Inbox} title="Queue is empty" description="No deliveries are waiting for a manual retry." compact />
        ) : (
          <ul className="divide-y divide-border">
            {data.data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">{d.subscriptionUrl ?? d.subscriptionId}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{d.event}</span> · {d.attempt} attempts ·{' '}
                    {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <DeliveryStatusBadge status={d.status} statusCode={d.statusCode} />
                    {d.error && <span className="text-xs text-muted-foreground">{d.error}</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRetry(d.id)}
                  disabled={retry.isPending && retry.variables === d.id}
                  aria-label={`Retry delivery ${d.id} to ${d.subscriptionUrl ?? d.subscriptionId}`}
                >
                  <RotateCw aria-hidden="true" className={retry.isPending && retry.variables === d.id ? 'animate-spin' : ''} />
                  Retry
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
