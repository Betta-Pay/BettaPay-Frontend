"use client";

import { KybDocumentsPanel } from "@/components/kyc/KybDocumentsPanel";

type Props = { merchantId?: string };

/**
 * Onboarding verification step (issue #458). KYB documents are optional to
 * finish onboarding — a merchant can upload now or later from
 * Settings → Verification — but starting here means review runs in parallel
 * with the rest of setup.
 */
export function StepKyc({ merchantId }: Props) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Business verification</h2>
        <p className="text-sm text-muted-foreground">
          Upload your KYB documents to verify your business. You can continue
          setup while our team reviews them, or add these later from
          Settings&nbsp;&rarr;&nbsp;Verification.
        </p>
      </div>
      {merchantId ? (
        <KybDocumentsPanel merchantId={merchantId} variant="onboarding" />
      ) : (
        <p className="text-sm text-muted-foreground">
          Sign in to upload verification documents.
        </p>
      )}
    </section>
  );
}
