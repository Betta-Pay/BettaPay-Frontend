"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { useWalletStore } from "@/lib/store/walletStore";
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus";
import { useAppTranslation } from "@/lib/i18n/useAppTranslation";
import {
  Wallet,
  Link2,
  Building2,
  Beaker,
  ArrowRight,
  X,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { setOnboardingCompleted } from "@/lib/auth/session";

interface Step {
  key: string;
  icon: LucideIcon;
  cta: {
    href?: string;
    onClick?: () => void;
  };
}

const STEPS: Step[] = [
  {
    key: "connectWallet",
    icon: Wallet,
    cta: {},
  },
  {
    key: "createPaymentLink",
    icon: Link2,
    cta: {
      href: "/payments",
    },
  },
  {
    key: "setupBankAccount",
    icon: Building2,
    cta: {
      href: "/settlement",
    },
  },
  {
    key: "testPayment",
    icon: Beaker,
    cta: {
      href: "/developers",
    },
  },
];

export const OnboardingWizard = () => {
  const { t } = useAppTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const { isConnected, setWalletModalOpen } = useWalletStore((s) => ({
    isConnected: s.isConnected,
    setWalletModalOpen: s.setWalletModalOpen,
  }));
  const { isOnboarded, hydrated, markComplete } = useOnboardingStatus();

  const visible = hydrated && !isOnboarded;
  const isLastStep = currentStep === STEPS.length - 1;
  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  const dismiss = useCallback(() => {
    setOnboardingCompleted(true);
    markComplete();
    localStorage.removeItem('bettapay_wizard_step');
  }, [markComplete]);

  const setAndSaveStep = useCallback((step: number) => {
    setCurrentStep(step);
    localStorage.setItem('bettapay_wizard_step', step.toString());
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setAndSaveStep(currentStep + 1);
    } else {
      dismiss();
    }
  }, [currentStep, dismiss, setAndSaveStep]);

  const handleStepCta = useCallback(
    (step: Step) => {
      if (currentStep === 0) {
        setWalletModalOpen(true);
      }
      step.cta.onClick?.();
      if (currentStep < STEPS.length - 1) {
        setAndSaveStep(currentStep + 1);
      } else {
        dismiss();
      }
    },
    [currentStep, dismiss, setWalletModalOpen, setAndSaveStep],
  );

  useEffect(() => {
    const saved = localStorage.getItem('bettapay_wizard_step');
    if (saved) {
      const step = parseInt(saved, 10);
      if (!isNaN(step) && step >= 0 && step < STEPS.length) {
        setCurrentStep(step);
      }
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      setCurrentStep(0);
      localStorage.removeItem('bettapay_wizard_step');
    }
  }, [visible]);

  if (!visible) return null;

  const StepIcon = STEPS[currentStep].icon;

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-amber-50 to-white shadow-sm transition-all dark:from-amber-950/20 dark:to-card">
      <div className="pointer-events-none absolute inset-0 bg-grid-slate-100/50 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] dark:bg-grid-slate-900/10" />

      <div className="relative p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 p-1 shadow-sm">
              <Image src="/logo.png" alt="BettaPay Logo" width={20} height={20} className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-bold text-foreground">{t("onboarding.gettingStarted")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("onboarding.stepProgress", { current: currentStep + 1, total: STEPS.length })}
            </span>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t("onboarding.dismissAriaLabel")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: progressPercent + "%" }}
          />
        </div>

        <div className="flex items-start gap-4">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20")}>
            <StepIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-base font-bold text-foreground">
              {t(`onboarding.steps.${STEPS[currentStep].key}.title` as never)}
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              {t(`onboarding.steps.${STEPS[currentStep].key}.description` as never)}
            </p>
            <div className="flex items-center gap-2">
              {STEPS[currentStep].cta.href ? (
                <Link href={STEPS[currentStep].cta.href} onClick={handleNext}>
                  <Button size="sm" className="shadow-button">
                    {t(`onboarding.steps.${STEPS[currentStep].key}.cta` as never)}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  className="shadow-button"
                  onClick={() => handleStepCta(STEPS[currentStep])}
                >
                  {isConnected ? t("onboarding.connected") : t(`onboarding.steps.${STEPS[currentStep].key}.cta` as never)}
                  {!isConnected && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                </Button>
              )}
              {!isLastStep && (
                <Button variant="ghost" size="sm" onClick={handleNext} className="text-muted-foreground">
                  {t("onboarding.skip")}
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 border-t border-border/50 pt-3">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setAndSaveStep(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === currentStep
                  ? "w-6 bg-primary"
                  : i < currentStep
                  ? "w-2 bg-primary/40"
                  : "w-2 bg-muted-foreground/20 hover:bg-muted-foreground/40",
              )}
              aria-label={t("onboarding.goToStep", { number: i + 1 })}
            />
          ))}
          <span className="ml-auto">
            <button
              type="button"
              onClick={dismiss}
              className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {t("onboarding.skipAll")}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};
