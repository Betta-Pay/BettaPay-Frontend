"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from "@/components/ui";

/**
 * Placeholder shown while the supported-asset list loads. Pickers render this
 * instead of any hard-coded list, so a stale set of assets is never offered.
 */
export function AssetGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-2"
      role="status"
      aria-busy="true"
      aria-label="Loading supported currencies"
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[62px] w-full rounded-xl" />
      ))}
    </div>
  );
}

export function AssetLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle>Couldn&apos;t load supported currencies</AlertTitle>
      <AlertDescription>
        <p>We can&apos;t confirm which currencies are available right now.</p>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Banner for a locally-selected asset an admin has since disabled or removed.
 * `onRemove` lets the user drop the stale choices in one click.
 */
export function UnsupportedAssetBanner({
  codes,
  onRemove,
  removeLabel = "Remove unsupported",
}: {
  codes: string[];
  onRemove?: () => void;
  removeLabel?: string;
}) {
  if (codes.length === 0) return null;
  const list = codes.join(", ");
  return (
    <Alert variant="warning" data-testid="unsupported-asset-banner">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle>
        {codes.length === 1 ? `${list} is no longer supported` : `${list} are no longer supported`}
      </AlertTitle>
      <AlertDescription>
        <p>
          {codes.length === 1 ? "This currency was" : "These currencies were"} disabled by
          BettaPay. Choose a supported one to continue.
        </p>
        {onRemove && (
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRemove}>
            {removeLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
