import { AlertTriangle, CheckCircle2, Clock, Skull } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { WebhookDelivery } from '@/lib/webhooks/types';

/**
 * Distinguishes outcomes by icon + text + colour, never colour alone. A 2xx is
 * "Delivered"; anything else, including a timeout with no status code, reads
 * as a failure.
 */
export function DeliveryStatusBadge({
  status,
  statusCode,
}: Pick<WebhookDelivery, 'status' | 'statusCode'>) {
  const code = statusCode ?? '—';
  if (status === 'delivered') {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 aria-hidden="true" /> Delivered · {code}
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock aria-hidden="true" /> Pending
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      {status === 'dead' ? <Skull aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
      {status === 'dead' ? 'Dead' : 'Failed'} · {code}
    </Badge>
  );
}
