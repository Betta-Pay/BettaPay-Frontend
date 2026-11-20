import { z } from "zod";
import type { SettingsSection, SettingsValues } from "./types";

const int = (label: string) => z.number({ message: `${label} must be a number.` }).int(`${label} must be a whole number.`);

export const feesSchema = z
  .object({
    defaultBps: int("Default fee").min(0, "Can't be negative.").max(10000, "Max is 10,000 bps."),
    capUsdc: z.number({ message: "Cap must be a number." }).min(0, "Can't be negative."),
    minFeeUsdc: z.number({ message: "Minimum must be a number." }).min(0, "Can't be negative."),
  })
  .refine((v) => v.minFeeUsdc <= v.capUsdc, { path: ["minFeeUsdc"], message: "Minimum fee can't exceed the cap." });

export const authPolicySchema = z.object({
  ipScoreThreshold: int("Threshold").min(1, "Must be at least 1.").max(1000, "Max is 1,000."),
  lockoutMaxFailures: int("Max failures").min(1, "Must be at least 1.").max(100, "Max is 100."),
  lockoutMinutes: int("Lockout").min(1, "Must be at least 1 minute.").max(1440, "Max is 1,440 minutes."),
});

export const rateLimitsSchema = z
  .object({
    globalRequestsPerMinute: int("Requests per minute").min(1, "Must be at least 1.").max(1_000_000, "Too high."),
    burst: int("Burst").min(1, "Must be at least 1.").max(1_000_000, "Too high."),
    windowSeconds: int("Window").min(1, "Must be at least 1 second.").max(3600, "Max is 3,600 seconds."),
  })
  .refine((v) => v.burst >= 1, { path: ["burst"], message: "Must be at least 1." });

export const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(280, "Use 280 characters or fewer."),
  readOnlyMode: z.boolean(),
});

export const sectionSchemas = {
  fees: feesSchema,
  authPolicy: authPolicySchema,
  rateLimits: rateLimitsSchema,
  maintenance: maintenanceSchema,
} as const;

export const DEFAULT_SETTINGS: SettingsValues = {
  fees: { defaultBps: 100, capUsdc: 250, minFeeUsdc: 0.1 },
  authPolicy: { ipScoreThreshold: 20, lockoutMaxFailures: 5, lockoutMinutes: 15 },
  rateLimits: { globalRequestsPerMinute: 600, burst: 100, windowSeconds: 60 },
  maintenance: { enabled: false, message: "", readOnlyMode: false },
};

export function isSection(v: string): v is SettingsSection {
  return v in sectionSchemas;
}

/** Zod issues -> `{ field: message }` (first message per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    out[key] ??= issue.message;
  }
  return out;
}
