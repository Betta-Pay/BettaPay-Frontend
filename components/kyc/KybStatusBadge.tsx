import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { STATUS_TONE_BADGE } from '@/lib/status/palette';
import { KYB_DOC_STATUS_META, KYB_STATUS_META } from '@/lib/kyc/status';
import type { KybDocStatus, KybStatus } from '@/lib/kyc/types';
import { CheckCircle2, Clock, FileUp, XCircle, CircleDashed } from 'lucide-react';

const KYB_STATUS_ICON: Record<KybStatus, React.ElementType> = {
  unverified: CircleDashed,
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

const DOC_STATUS_ICON: Record<KybDocStatus, React.ElementType> = {
  uploaded: FileUp,
  under_review: Clock,
  verified: CheckCircle2,
  rejected: XCircle,
};

interface BadgeProps {
  className?: string;
}

export function KybStatusBadge({ status, className }: BadgeProps & { status: KybStatus }) {
  const meta = KYB_STATUS_META[status];
  const Icon = KYB_STATUS_ICON[status];
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 font-semibold', STATUS_TONE_BADGE[meta.tone], className)}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}

export function KybDocStatusBadge({
  status,
  className,
}: BadgeProps & { status: KybDocStatus }) {
  const meta = KYB_DOC_STATUS_META[status];
  const Icon = DOC_STATUS_ICON[status];
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 font-semibold', STATUS_TONE_BADGE[meta.tone], className)}
    >
      <Icon
        className={cn('h-3 w-3', status === 'under_review' && 'animate-pulse')}
        aria-hidden="true"
      />
      {meta.label}
    </Badge>
  );
}
