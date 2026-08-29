import { Button } from "@/components/ui";
import type { OnboardingData } from "@/app/onboarding/page";
import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  data: OnboardingData;
  onEdit: (step: number) => void;
  isValidating: boolean;
  validationError: string | null;
  driftedFields: string[];
  onRetry: () => void;
};

import { accountNumberSchema } from "@/lib/utils/onboardingSchemas";

const rows = (data: OnboardingData) => [
  {
    key: "business",
    label: "Business",
    value: `${data.businessName} · ${data.businessType} · ${data.country}`,
    step: 0,
  },
  {
    key: "currency",
    label: "Currency",
    value: `${data.settlementCurrency} · Auto-convert ${data.autoConvert ? "on" : "off"}`,
    step: 1,
  },
  {
    key: "settlement",
    label: "Settlement",
    value: `${data.preferredAnchor}${data.accountNumber ? ` · ${data.bankName ? `${data.bankName}: ` : ''}${data.accountNumber}` : ''} · Auto-settle ${data.autoSettle ? "on" : "off"}`,
    step: 2,
    invalid: Boolean(data.accountNumber && !accountNumberSchema.safeParse(data.accountNumber).success),
  },
  {
    key: "webhook",
    label: "Webhook",
    value: data.webhookUrl || "Not configured",
    step: 3,
  },
] as const;


export function StepReview({
  data,
  onEdit,
  isValidating,
  validationError,
  driftedFields,
  onRetry,
}: Props) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Review your setup</h2>
        <p className="text-sm text-muted-foreground">
          Confirm these details before saving them to your merchant account.
        </p>
      </div>

      {isValidating && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span className="font-medium">Verifying your setup against backend configuration...</span>
        </div>
      )}

      {validationError && driftedFields.length === 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <span className="font-medium">{validationError}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="w-fit border-destructive/30 hover:bg-destructive/10 text-destructive font-semibold h-8"
          >
            <RefreshCcw className="mr-2 h-3.5 w-3.5" />
            Retry verification
          </Button>
        </div>
      )}

      {driftedFields.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="font-semibold">Configuration drift detected</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Some of your selections are no longer supported on the backend. Please edit the highlighted steps before continuing.
            </p>
          </div>
        </div>
      )}

      <dl className="divide-y rounded-xl border overflow-hidden">
        {rows(data).map((row) => {
          const { key, label, value, step } = row;
          const isInvalid = 'invalid' in row && Boolean(row.invalid);
          const isDrifted = driftedFields.includes(
            key === "currency" ? "currency" : key === "settlement" ? "anchor" : ""
          );

          return (
            <div
              key={label}
              className={cn(
                "flex items-center gap-3 p-4 transition-all duration-200",
                (isDrifted || isInvalid)
                  ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30"
                  : "hover:bg-muted/30"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <dt className="text-sm font-medium">{label}</dt>
                  {isDrifted && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 animate-pulse">
                      Outdated / Drifted
                    </span>
                  )}
                  {isInvalid && (
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive animate-pulse">
                      Invalid Format
                    </span>
                  )}
                </div>
                <dd className="truncate text-sm text-muted-foreground mt-0.5">
                  {value}
                </dd>
                {isDrifted && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 inline" />
                    This preference is no longer supported by the current backend config.
                  </p>
                )}
                {isInvalid && (
                  <p className="text-xs text-destructive mt-1.5 flex items-center gap-1 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 inline" />
                    Invalid bank account format. Enter a 10-digit account number or valid IBAN.
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant={(isDrifted || isInvalid) ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onEdit(step)}
                className={cn(
                  (isDrifted || isInvalid) &&
                    "border-amber-500/30 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                )}
              >
                {(isDrifted || isInvalid) ? "Fix Selection" : "Edit"}
              </Button>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
