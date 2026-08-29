"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { getDefaultRoute } from "@/lib/utils";
import { useNotify } from "@/lib/hooks/useNotify";
import { useAuthStore } from "@/lib/store/authStore";
import { apiClient } from "@/lib/api/axios";
import { Stepper } from "@/components/onboarding/Stepper";
import { StepBusinessInfo } from "@/components/onboarding/StepBusinessInfo";
import { StepCurrency } from "@/components/onboarding/StepCurrency";
import { StepSettlement } from "@/components/onboarding/StepSettlement";
import { StepWebhook } from "@/components/onboarding/StepWebhook";
import { StepReview } from "@/components/onboarding/StepReview";
import { accountNumberSchema, bankCodeSchema } from "@/lib/utils/onboardingSchemas";
import { setOnboardingCompleted } from "@/lib/auth/session";

export type OnboardingData = {
  businessName: string;
  businessType: "individual" | "business";
  country: string;
  settlementCurrency: string;
  autoConvert: boolean;
  preferredAnchor: string;
  autoSettle: boolean;
  webhookUrl: string;
  accountNumber?: string;
  bankCode?: string;
  bankName?: string;
};

const initialData: OnboardingData = {
  businessName: "",
  businessType: "business",
  country: "Nigeria",
  settlementCurrency: "NGN",
  autoConvert: true,
  preferredAnchor: "Cowry",
  autoSettle: true,
  webhookUrl: "",
  accountNumber: "",
  bankCode: "",
  bankName: "",
};


const STORAGE_KEY = "bettapay_onboarding_progress";

type SavedProgress = {
  step: number;
  data: OnboardingData;
  savedAt: number;
};

const steps = ["Business info", "Currency", "Settlement", "Webhook", "Review"];

/**
 * Safely read persisted onboarding progress from localStorage.
 * Returns `null` when no valid data exists or if localStorage is
 * unavailable (e.g. SSR / incognito with storage disabled).
 */
function loadSavedProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: SavedProgress = JSON.parse(raw);
    if (
      !Number.isInteger(parsed.step) ||
      parsed.step < 0 ||
      parsed.step >= steps.length ||
      !parsed.data ||
      typeof parsed.data !== "object" ||
      typeof parsed.savedAt !== "number"
    ) {
      clearSavedProgress();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveProgress(step: number, data: OnboardingData): void {
  try {
    const payload: SavedProgress = { step, data, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be full or unavailable — silently ignore.
  }
}

function clearSavedProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore.
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const notify = useNotify();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [driftedFields, setDriftedFields] = useState<string[]>([]);
  const [revalidated, setRevalidated] = useState(false);

  // On mount, check for saved progress and offer to resume.
  useEffect(() => {
    const saved = loadSavedProgress();
    if (saved) {
      setSavedProgress(saved);
      setShowResumePrompt(true);
    }
  }, []);

  const handleResume = useCallback(() => {
    if (savedProgress) {
      setStep(savedProgress.step);
      setData(savedProgress.data);
    }
    setShowResumePrompt(false);
  }, [savedProgress]);

  const handleStartFresh = useCallback(() => {
    clearSavedProgress();
    setStep(0);
    setData(initialData);
    setSavedProgress(null);
    setShowResumePrompt(false);
  }, []);

  // Trim string inputs upfront so state always reflects the cleaned value.
  // This keeps the validation logic in sync with what is actually sent to
  // the API at submit time (and prevents inputs like "  Acme  " from being
  // stored as-is and validated against the trimmed length in isolation).
  const updateData = (changes: Partial<OnboardingData>) => {
    const cleaned = Object.fromEntries(
      Object.entries(changes).map(([k, v]) => [
        k,
        typeof v === 'string' ? v.trim() : v,
      ]),
    ) as Partial<OnboardingData>;
    setData((current) => {
      const updated = { ...current, ...cleaned };
      saveProgress(step, updated);
      return updated;
    });
    setErrors({});
  };

  const revalidateData = useCallback(async () => {
    setIsValidating(true);
    setValidationError(null);
    setDriftedFields([]);
    setRevalidated(false);
    try {
      const [anchorsRes, ratesRes] = await Promise.all([
        apiClient.get("/api/anchors"),
        apiClient.get("/api/rates"),
      ]);

      const enabledAnchors = anchorsRes.data?.data || [];
      const ratesResponse = ratesRes.data?.rates || [];

      const drifted: string[] = [];

      // Validate currency
      const currency = data.settlementCurrency;
      if (currency && currency !== "NGN") {
        const isCurrencyValid = ratesResponse.some(
          (r: any) => r.from === currency && r.to === "NGN"
        );
        if (!isCurrencyValid) {
          drifted.push("currency");
        }
      }

      // Validate preferred anchor
      const anchor = data.preferredAnchor;
      if (anchor) {
        const isAnchorValid = enabledAnchors.some(
          (a: any) =>
            a.name.toLowerCase().includes(anchor.toLowerCase()) ||
            a.code.toLowerCase().includes(anchor.toLowerCase()) ||
            (anchor.length >= 4 && (
              a.name.toLowerCase().includes(anchor.toLowerCase().substring(0, 4)) ||
              a.code.toLowerCase().includes(anchor.toLowerCase().substring(0, 4))
            ))
        );
        if (!isAnchorValid) {
          drifted.push("anchor");
        }
      }

      if (drifted.length > 0) {
        setDriftedFields(drifted);
        setValidationError("Some of your selected preferences are no longer supported by the backend. Please edit them.");
      } else {
        setRevalidated(true);
      }
    } catch (error) {
      setValidationError("Failed to connect to the backend to verify configuration. Please check your connection and try again.");
    } finally {
      setIsValidating(false);
    }
  }, [data.settlementCurrency, data.preferredAnchor]);

  useEffect(() => {
    if (step === 4) {
      void revalidateData();
    } else {
      setRevalidated(false);
      setDriftedFields([]);
      setValidationError(null);
    }
  }, [step, revalidateData]);

  const validate = (targetStep: number) => {
    const nextErrors: Record<string, string> = {};
    if (targetStep === 0) {
      if (data.businessName.trim().length < 2) nextErrors.businessName = "Enter a business name with at least 2 characters.";
      if (!data.country) nextErrors.country = "Select your country.";
    }
    if (targetStep === 1 && !data.settlementCurrency) nextErrors.settlementCurrency = "Choose a settlement currency.";
    if (targetStep === 2) {
      if (!data.preferredAnchor) nextErrors.preferredAnchor = "Choose a preferred anchor.";
      if (data.accountNumber && data.accountNumber.trim()) {
        const res = accountNumberSchema.safeParse(data.accountNumber);
        if (!res.success) {
          nextErrors.accountNumber = res.error.issues[0]?.message || "Invalid account number or IBAN format.";
        }
      }
      if (data.bankCode && data.bankCode.trim()) {
        const res = bankCodeSchema.safeParse(data.bankCode);
        if (!res.success) {
          nextErrors.bankCode = res.error.issues[0]?.message || "Invalid bank code.";
        }
      }
    }
    // webhookUrl is optional — skip URL validation entirely when it is
    // empty so a blank input never triggers a runtime exception from new URL().
    if (targetStep === 3 && data.webhookUrl.trim()) {
      try { new URL(data.webhookUrl); } catch { nextErrors.webhookUrl = "Enter a valid URL, including https://."; }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goToStep = (target: number) => {
    if (target <= step || validate(step)) {
      setStep(target);
      saveProgress(target, data);
    }
  };

  const skip = () => {
    // Skipping is not "not onboarded" — it just defers the flow. Don't touch
    // the shared completion flag (issue #495): writing it here is what made
    // the dismissible wizard reappear after the 5-step page had been done.
    clearSavedProgress();
    setOnboardingCompleted(false);
    localStorage.removeItem("onboardingDraft");
    notify.success("Onboarding saved for later. You can finish it from Settings.");
    router.push(getDefaultRoute(user?.role));
  };

  const submit = async () => {
    if (!user) { router.push("/auth/login"); return; }
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/api/merchants/${user.id}`, {
        name: data.businessName.trim(), businessType: data.businessType, country: data.country,
      });
      await apiClient.patch(`/api/merchants/${user.id}/settings`, {
        defaultSettlementCurrency: data.settlementCurrency, autoConvert: data.autoConvert,
        preferredAnchor: data.preferredAnchor, autoSettle: data.autoSettle,
        webhookUrl: data.webhookUrl || null,
        bankName: data.bankName || null,
        bankCode: data.bankCode || null,
        accountNumber: data.accountNumber || null,
      });
      clearSavedProgress();
      setOnboardingCompleted(true);
      notify.success("Your merchant profile is ready!");
      router.push(getDefaultRoute(user?.role));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save your onboarding details.";
      notify.error(message);
    } finally { setIsSubmitting(false); }
  };

  const advanceStep = (newStep: number) => {
    setStep(newStep);
    saveProgress(newStep, data);
  };

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 sm:py-12">
      {/* Resume prompt overlay */}
      {showResumePrompt && savedProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-lg mx-4">
            <CardHeader>
              <CardTitle className="text-xl">Resume onboarding?</CardTitle>
              <CardDescription>
                You have unsaved onboarding progress from a previous session
                (step {savedProgress.step + 1} of {steps.length}: {steps[savedProgress.step]}).
                Would you like to pick up where you left off?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={handleResume} className="flex-1">
                Resume
              </Button>
              <Button variant="outline" onClick={handleStartFresh} className="flex-1">
                Start fresh
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mx-auto w-full max-w-3xl shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl sm:text-3xl">Set up your merchant account</CardTitle>
          <CardDescription>Tell us how you want to receive and manage payments. You can update these choices later.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Stepper steps={steps} currentStep={step} onStepClick={goToStep} />
          {step === 0 && <StepBusinessInfo data={data} errors={errors} onChange={updateData} />}
          {step === 1 && <StepCurrency data={data} errors={errors} onChange={updateData} />}
          {step === 2 && <StepSettlement data={data} errors={errors} onChange={updateData} />}
          {step === 3 && <StepWebhook data={data} errors={errors} onChange={updateData} />}
          {step === 4 && (
            <StepReview
              data={data}
              onEdit={advanceStep}
              isValidating={isValidating}
              validationError={validationError}
              driftedFields={driftedFields}
              onRetry={revalidateData}
            />
          )}
          <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {step > 0 && <Button variant="outline" onClick={() => advanceStep(step - 1)} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>}
              <Button variant="ghost" onClick={skip} disabled={isSubmitting}>Complete later</Button>
            </div>
            {step < steps.length - 1 ? (
              <Button onClick={() => validate(step) && advanceStep(step + 1)}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button onClick={submit} disabled={isSubmitting || isValidating || !revalidated}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Finish setup</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
