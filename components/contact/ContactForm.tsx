"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

// Define schema matching API validations
const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  company: z.string().optional(),
  subject: z.enum(
    ["General", "Sales", "Technical Support", "Careers", "Partnership", "Bug Report", "Other"],
    { message: "Please select a valid subject." }
  ),
  message: z
    .string()
    .min(20, { message: "Message must be at least 20 characters." })
    .max(2000, { message: "Message must not exceed 2000 characters." }),
  website: z.string().optional(), // Honeypot field
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const SUBJECT_OPTIONS = [
  "General",
  "Sales",
  "Technical Support",
  "Careers",
  "Partnership",
  "Bug Report",
  "Other",
] as const;

function getPrefilledSubject(param: string | null): typeof SUBJECT_OPTIONS[number] {
  if (!param) return "General";
  const p = param.toLowerCase().trim();
  if (p === "careers") return "Careers";
  if (p === "sales" || p === "enterprise-pricing") return "Sales";
  if (p === "technical-support" || p === "support") return "Technical Support";
  if (p === "partnership" || p === "partnerships") return "Partnership";
  if (p === "bug-report" || p === "bug") return "Bug Report";
  if (p === "other") return "Other";
  return "General";
}

export default function ContactForm() {
  const searchParams = useSearchParams();
  const subjectParam = searchParams.get("subject");
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      company: "",
      subject: getPrefilledSubject(subjectParam),
      message: "",
      website: "",
    },
  });

  // Dynamic script loader for reCAPTCHA v3
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) return;

    if (window.grecaptcha) {
      setRecaptchaLoaded(true);
      return;
    }

    // Check if script already exists in head
    const existingScript = document.querySelector(`script[src*="recaptcha/api.js"]`);
    if (existingScript) {
      setRecaptchaLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setRecaptchaLoaded(true);
    script.onerror = () => console.warn("Failed to load Google reCAPTCHA script.");
    document.body.appendChild(script);
  }, []);

  // Sync subject when query param changes
  useEffect(() => {
    if (subjectParam) {
      setValue("subject", getPrefilledSubject(subjectParam));
    }
  }, [subjectParam, setValue]);

  // Execute reCAPTCHA token generation
  const getRecaptchaToken = async (): Promise<string | null> => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const grecaptcha = window.grecaptcha;
    if (!siteKey || !recaptchaLoaded || !grecaptcha) {
      return null;
    }

    return new Promise((resolve) => {
      grecaptcha.ready(async () => {
        try {
          const token = await grecaptcha.execute(siteKey, {
            action: "contact_submit",
          });
          resolve(token);
        } catch (error) {
          console.error("reCAPTCHA execution error:", error);
          resolve(null);
        }
      });
    });
  };

  const onSubmit = async (data: ContactFormData) => {
    const recaptchaToken = await getRecaptchaToken();

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          recaptchaToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Something went wrong.");
      }

      toast.success("Message sent successfully! We will get back to you shortly.");
      
      // Reset form but preserve honeypot setup
      reset({
        name: "",
        email: "",
        company: "",
        subject: "General",
        message: "",
        website: "",
      });
    } catch (error) {
      console.error("Submission error:", error);
      const message = error instanceof Error ? error.message : "";
      toast.error(message || "Failed to send message. Please try again later.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-sm"
      noValidate
    >
      {/* Honeypot field (hidden from screen readers & users, bots will auto-fill it) */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website">Website URL (leave blank)</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="John Doe"
            disabled={isSubmitting}
            aria-invalid={errors.name ? "true" : "false"}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1 font-medium" id="name-error">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            disabled={isSubmitting}
            aria-invalid={errors.email ? "true" : "false"}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1 font-medium" id="email-error">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Company Field (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="company">Company (Optional)</Label>
          <Input
            id="company"
            placeholder="BettaPay Inc."
            disabled={isSubmitting}
            {...register("company")}
          />
        </div>

        {/* Subject Select Field */}
        <div className="space-y-2 flex flex-col justify-start">
          <Label htmlFor="subject">
            Subject <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="subject"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(val) => field.onChange(val)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="subject" className="w-full text-foreground">
                  <SelectValue placeholder="Select contact reason" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground rounded-lg border border-border shadow-md">
                  {SUBJECT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.subject && (
            <p className="text-xs text-destructive mt-1 font-medium" id="subject-error">
              {errors.subject.message}
            </p>
          )}
        </div>
      </div>

      {/* Message Textarea */}
      <div className="space-y-2">
        <Label htmlFor="message">
          Message <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="message"
          rows={6}
          disabled={isSubmitting}
          aria-invalid={errors.message ? "true" : "false"}
          placeholder="Please describe how we can help you..."
          className={cn(
            "w-full min-h-[120px] rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
          )}
          {...register("message")}
        />
        {errors.message && (
          <p className="text-xs text-destructive mt-1 font-medium" id="message-error">
            {errors.message.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 h-11 bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send Message
          </>
        )}
      </Button>

      {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
        <p className="text-[10px] text-muted-foreground text-center">
          This site is protected by reCAPTCHA and the Google{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Terms of Service
          </a>{" "}
          apply.
        </p>
      )}
    </form>
  );
}
