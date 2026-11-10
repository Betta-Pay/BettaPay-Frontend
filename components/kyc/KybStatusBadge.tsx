'use client';

import React, { useId, useState } from 'react';
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

export interface BadgeProps {
  className?: string;
  /** Specific compliance feedback reason displayed in a tooltip when rejected. */
  reason?: string | null;
  /** Alias for `reason` matching backend payload naming. */
  rejectionReason?: string | null;
}

function RejectionReasonTooltip({
  reason,
  children,
}: {
  reason: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="relative inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
      tabIndex={0}
      aria-describedby={isOpen ? tooltipId : undefined}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
      onClick={() => setIsOpen((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      }}
    >
      {children}
      {isOpen && (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-xs -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-normal text-white shadow-md"
        >
          {reason}
          <span
            aria-hidden="true"
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"
          />
        </span>
      )}
    </span>
  );
}

export function KybStatusBadge({
  status,
  reason,
  rejectionReason,
  className,
}: BadgeProps & { status: KybStatus }) {
  const meta = KYB_STATUS_META[status];
  const Icon = KYB_STATUS_ICON[status];
  const resolvedReason = (reason ?? rejectionReason)?.trim();

  const badge = (
    <Badge
      variant="outline"
      className={cn('gap-1 font-semibold', STATUS_TONE_BADGE[meta.tone], className)}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </Badge>
  );

  if (status === 'rejected' && resolvedReason) {
    return <RejectionReasonTooltip reason={resolvedReason}>{badge}</RejectionReasonTooltip>;
  }

  return badge;
}

export function KybDocStatusBadge({
  status,
  reason,
  rejectionReason,
  className,
}: BadgeProps & { status: KybDocStatus }) {
  const meta = KYB_DOC_STATUS_META[status];
  const Icon = DOC_STATUS_ICON[status];
  const resolvedReason = (reason ?? rejectionReason)?.trim();

  const badge = (
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

  if (status === 'rejected' && resolvedReason) {
    return <RejectionReasonTooltip reason={resolvedReason}>{badge}</RejectionReasonTooltip>;
  }

  return badge;
}
