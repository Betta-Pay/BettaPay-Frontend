'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';
import { useDeliveries } from '@/lib/webhooks/client';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';

export function DeliveryHistoryDialog({
  subscriptionId,
  url,
  onClose,
}: {
  subscriptionId: string | null;
  url: string | null;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useDeliveries(subscriptionId);

  return (
    <Dialog open={Boolean(subscriptionId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Delivery history</DialogTitle>
          <DialogDescription className="break-all">{url}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2" aria-label="Loading delivery history">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">{(error as Error).message}</p>
        ) : !data?.data.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No deliveries yet. Send a test event to create one.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Result</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                  <TableHead className="text-right">Attempt</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((d) => (
                  <TableRow key={d.id} data-status={d.status}>
                    <TableCell>
                      <DeliveryStatusBadge status={d.status} statusCode={d.statusCode} />
                      {d.error && <p className="mt-1 text-xs text-muted-foreground">{d.error}</p>}
                      {d.replayOf && <p className="mt-1 text-xs text-muted-foreground">Replay of {d.replayOf}</p>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{d.event}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.latencyMs === null ? '—' : `${d.latencyMs} ms`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{d.attempt}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <time dateTime={d.createdAt}>{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}</time>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
