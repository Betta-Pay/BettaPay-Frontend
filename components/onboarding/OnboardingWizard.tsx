"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/lib/store/walletStore";
import {
  Wallet,
  Link2,
  Building2,
  Beaker,
  ShieldCheck,
  ArrowRight,
  X,
  ChevronRight,
} from "lucide-react";

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  cta: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const STEPS: Step[] = [
  {
    title: "Connect your Freighter wallet",
    description:
      "Link your Stellar wallet to start accepting USDC payments on the Stellar network.",
    icon: Wallet,
    cta: {
      label: "Connect Wallet",
      onClick: () => {},
    },
  },
  {
    title: "Create your first payment link",
    description:
      "Generate a reusable payment link or QR code to share with your customers.",
    icon: Link2,
    cta: {
      label: "Create Payment Link",
      href: "/payments",
    },
  },
  {
    title: "Set up your bank account",
    description:
      "Add your Nigerian bank account details to enable USDC → NGN settlements.",
    icon: Building2,
    cta: {
      label: "Configure Settlements",
      href: "/settlement",
    },
  },
  {
    title: "Test a payment",
    description:
      "Try the sandbox environment to verify your integration before going live.",
    icon: Beaker,
    cta: {
      label: "Open Sandbox",
      href: "/developers",
    },
  },
];

export const OnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const { isConnected } = useWalletStore();

  useEffect(() => {
    const completed = localStorage.getItem("onboardingCompleted");
    if (completed === "true") {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem("onboardingCompleted", "true");
    setVisible(false);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [currentStep, dismiss]);

  const handleStepCta = useCallback(
    (step: Step) => {
      if (step.cta.onClick) {
        step.cta.onClick();
      }
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        dismiss();
      }
    },
    [currentStep, dismiss]
  );

  if (!visible) return null;

  const isLastStep = currentStep === STEPS.length - 1;
  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;
  const StepIcon = STEPS[currentStep].icon;

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-card shadow-sm transition-all">
      <div className="absolute inset-0 bg-grid-slate-100/50 dark:bg-grid-slate-900/10 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] pointer-events-none" />

      <div className="relative p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground">
              Getting Started
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <button
              onClick={dismiss}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Dismiss onboarding"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              "bg-primary/20"
            )}
          >
            <StepIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground mb-1">
              {STEPS[currentStep].title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {STEPS[currentStep].description}
            </p>
            <div className="flex items-center gap-2">
              {STEPS[currentStep].cta.href ? (
                <Link href={STEPS[currentStep].cta.href} onClick={handleNext}>
                  <Button size="sm" className="shadow-button">
                    {STEPS[currentStep].cta.label}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  className="shadow-button"
                  onClick={() => handleStepCta(STEPS[currentStep])}
                >
                  {isConnected ? "Connected" : STEPS[currentStep].cta.label}
                  {!isConnected && <ArrowRight className="w-3.5 h-3.5 ml-1.5" />}
                </Button>
              )}
              {!isLastStep && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  className="text-muted-foreground"
                >
                  Skip
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/50">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                i === currentStep
                  ? "bg-primary w-6"
                  : i < currentStep
                  ? "bg-primary/40"
                  : "bg-muted-foreground/20 hover:bg-muted-foreground/40"
              )}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
          <span className="ml-auto">
            <button
              onClick={dismiss}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Skip all
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};
