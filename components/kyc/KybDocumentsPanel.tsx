'use client';

/**
 * The shared KYB document collection surface, used by both the onboarding
 * verification step and `/settings/kyb`. Shows the merchant-level status, a
 * submission-level rejection banner, and one row per document slot.
 *
 * `variant="onboarding"` trims the chrome (no card wrapper) so it sits inside
 * the wizard; `variant="settings"` renders a standalone card.
 *
 * The panel body is wrapped in the shared `ErrorBoundary` (#756): a bad API
 * payload (e.g. an unknown `kybStatus` or a non-array `documents` field) used
 * to throw during render and take down the whole page. The boundary now
 * contains the failure to this panel and offers a Retry action that
 * invalidates the cached query and remounts the body.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { kybQueryKeys, useMerchantKyb } from '@/lib/kyc/api';
import { KYB_STATUS_META } from '@/lib/kyc/status';
import { KYB_DOC_TYPES, REQUIRED_KYB_DOC_TYPES } from '@/lib/kyc/types';
import { ErrorBoundary, ErrorDisplay } from '@/components/shared';
import { KybDocumentRow } from './KybDocumentRow';
import { KybStatusBadge } from './KybStatusBadge';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface Props {
  merchantId: string;
  variant?: 'onboarding' | 'settings';
  /** Render the "simulate reviewer rejection" testing control. */
  allowSimulatedReview?: boolean;
}

/**
 * The data-dependent body. Deliberately extracted from `KybDocumentsPanel` so
 * an error boundary around it can catch a render throw — a boundary cannot
 * catch errors thrown by its own render output.
 */
function KybDocumentsPanelBody({
  merchantId,
  allowSimulatedReview,
}: {
  merchantId: string;
  allowSimulatedReview: boolean;
}) {
  const { data: kyb, isLoading, error } = useMerchantKyb(merchantId);
  const [simulateReject, setSimulateReject] = useState(false);

  const byType = new Map(kyb.documents.map((d) => [d.type, d]));
  const requiredUploaded = REQUIRED_KYB_DOC_TYPES.filter((t) => byType.has(t)).length;
  const statusMeta = KYB_STATUS_META[kyb.kybStatus];

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Document Status:</span>
          <span className="text-sm font-medium text-foreground">Verification status</span>
          {!isLoading && <KybStatusBadge status={kyb.kybStatus} />}
        </div>
        <span className="text-xs text-muted-foreground">
          {requiredUploaded}/{REQUIRED_KYB_DOC_TYPES.length} required documents
        </span>
      </div>

      {!isLoading && (
        <p className="text-xs text-muted-foreground">{statusMeta.description}</p>
      )}

      {/* Submission-level rejection */}
      {kyb.kybStatus === 'rejected' && kyb.rejectionReason && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <span className="sr-only">Status: Rejected</span>
          <AlertTitle>Verification needs attention</AlertTitle>
          <AlertDescription>{kyb.rejectionReason}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <span className="sr-only">Status: Error</span>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {allowSimulatedReview && (
        <label className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={simulateReject}
            onChange={(e) => setSimulateReject(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Simulate a reviewer rejection on my next upload (testing aid)
        </label>
      )}

      {/* Document slots */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {KYB_DOC_TYPES.map((meta) => (
            <KybDocumentRow
              key={meta.type}
              merchantId={merchantId}
              meta={meta}
              document={byType.get(meta.type) ?? null}
              simulateReject={simulateReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function KybDocumentsPanel({
  merchantId,
  variant = 'settings',
  allowSimulatedReview = false,
}: Props) {
  const queryClient = useQueryClient();
  const [retryAttempt, setRetryAttempt] = useState(0);

  const handleRetry = () => {
    // Two-part recovery: drop the (possibly malformed) cached KYB payload so
    // the remounted body refetches instead of replaying stale data, then
    // remount the boundary children via resetKey.
    void queryClient.invalidateQueries({
      queryKey: kybQueryKeys.profile(merchantId),
    });
    setRetryAttempt((n) => n + 1);
  };

  const body = (
    <ErrorBoundary
      resetKey={retryAttempt}
      fallback={
        // The settings variant's card chrome sits outside the boundary, so
        // this in-place fallback fills the same slot for both variants.
        <ErrorDisplay
          message="We couldn't load your verification documents."
          onRetry={handleRetry}
          retryLabel="Retry"
        />
      }
    >
      <KybDocumentsPanelBody
        merchantId={merchantId}
        allowSimulatedReview={allowSimulatedReview}
      />
    </ErrorBoundary>
  );

  if (variant === 'onboarding') {
    return body;
  }

  return (
    <Card className={cn('border border-border bg-card shadow-sm')}>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Business verification (KYB)
        </CardTitle>
        <CardDescription>
          Upload your business documents. PDF, JPG, or PNG, up to 10 MB each.
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
