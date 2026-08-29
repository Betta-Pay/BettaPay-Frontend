"use client";

import { useAuthStore } from "@/lib/store/authStore";
import { KybDocumentsPanel } from "@/components/kyc/KybDocumentsPanel";

/**
 * `/settings/kyb` — the merchant's business verification page (issue #458).
 * Upload KYB documents, watch upload progress, and track review status
 * (uploaded → under review → verified / rejected). Verification unlocks
 * settlement rule configuration.
 */
export default function KybSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const merchantId =
    user?.id ?? (user as { merchantId?: string } | null)?.merchantId ?? "";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Business verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload and track your KYB documents. Verification unlocks settlement
          rule configuration and higher limits.
        </p>
      </header>

      {merchantId ? (
        <KybDocumentsPanel
          merchantId={merchantId}
          variant="settings"
          allowSimulatedReview
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Sign in to manage your verification documents.
        </p>
      )}
    </div>
  );
}
