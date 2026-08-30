import React from "react";
import { Toggle, Input } from "@/components/ui";
import type { OnboardingData } from "@/app/onboarding/page";
import { cn } from "@/lib/utils";

type Props = {
  data: OnboardingData;
  errors: Record<string, string>;
  onChange: (data: Partial<OnboardingData>) => void;
};

const anchors = ["Cowry", "ClickPesa", "KachinTech"];

export function StepSettlement({ data, errors, onChange }: Props) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Settlement preferences</h2>
        <p className="text-sm text-muted-foreground">
          Select an anchor and configure your bank account details for settlements.
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preferred Settlement Partner
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {anchors.map((anchor) => (
            <button
              key={anchor}
              type="button"
              onClick={() => onChange({ preferredAnchor: anchor })}
              className={cn(
                "w-full rounded-lg border p-4 text-left transition-all",
                data.preferredAnchor === anchor
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <p className="font-medium text-foreground">{anchor}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Preferred partner
              </p>
            </button>
          ))}
        </div>
        {errors.preferredAnchor && (
          <p className="text-xs text-destructive">{errors.preferredAnchor}</p>
        )}
      </div>

      <div className="space-y-4 rounded-xl border p-4 bg-card">
        <h3 className="text-sm font-semibold text-foreground">
          Bank Account Details
        </h3>
        <p className="text-xs text-muted-foreground">
          Provide your local bank account number (10-digit NUBAN or IBAN format) to receive fiat payouts.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="bankName" className="text-xs font-medium text-foreground">
              Bank Name
            </label>
            <Input
              id="bankName"
              placeholder="e.g. GTBank, Zenith Bank"
              value={data.bankName || ""}
              onChange={(e) => onChange({ bankName: e.target.value })}
              className={cn(errors.bankName && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.bankName && (
              <p className="text-xs text-destructive">{errors.bankName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bankCode" className="text-xs font-medium text-foreground">
              Bank Code / Sort Code
            </label>
            <Input
              id="bankCode"
              placeholder="e.g. 058 or GTBIGLA"
              value={data.bankCode || ""}
              onChange={(e) => onChange({ bankCode: e.target.value })}
              className={cn(errors.bankCode && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.bankCode && (
              <p className="text-xs text-destructive">{errors.bankCode}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="accountNumber" className="text-xs font-medium text-foreground">
            Account Number / IBAN
          </label>
          <Input
            id="accountNumber"
            placeholder="10-digit account number or IBAN"
            value={data.accountNumber || ""}
            onChange={(e) => onChange({ accountNumber: e.target.value })}
            className={cn(errors.accountNumber && "border-destructive focus-visible:ring-destructive")}
          />
          {errors.accountNumber && (
            <p className="text-xs text-destructive">{errors.accountNumber}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium text-sm">Auto-settle</p>
          <p className="text-xs text-muted-foreground">
            Settle available balances automatically when threshold is reached.
          </p>
        </div>
        <Toggle
          checked={data.autoSettle}
          label="Auto-settle"
          onClick={() => onChange({ autoSettle: !data.autoSettle })}
        />
      </div>
    </section>
  );
}

