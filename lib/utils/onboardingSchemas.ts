import { z } from "zod";

/**
 * Zod schema for bank settlement details (Issue #559).
 * Validates account numbers (10-digit NUBAN or 15–34 char IBAN) and bank codes (3-11 alphanumerics).
 */
export const accountNumberSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      const clean = val.replace(/\s+/g, "");
      const isNuban = /^\d{10}$/.test(clean);
      const isIban = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i.test(clean);
      const isGenericAccount = /^\d{8,17}$/.test(clean);
      return isNuban || isIban || isGenericAccount;
    },
    {
      message:
        "Invalid account number or IBAN format. Account numbers must be 10 digits or valid IBAN (15–34 characters).",
    }
  );

export const bankCodeSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      return /^[a-zA-Z0-9]{3,11}$/.test(val);
    },
    {
      message: "Bank code must be 3–11 alphanumeric characters.",
    }
  );

export const bankDetailsSchema = z.object({
  accountNumber: accountNumberSchema,
  bankCode: bankCodeSchema,
  bankName: z.string().trim().optional(),
});

export type BankDetails = z.infer<typeof bankDetailsSchema>;

// `error` (not `errorMap`) is the zod v4 spelling — the old key was silently
// ignored and left this call with no matching overload.
export const businessTypeSchema = z.enum(["individual", "business"], {
  error: () => ({ message: "Business type must be either 'individual' or 'business'" })
});

/**
 * Business info step schema (issue #754).
 *
 * The onboarding wizard runs on React Hook Form, so this schema is wired up
 * with `zodResolver` and the country `Select` is registered through
 * `Controller` — that is what makes the shadcn dropdown validate like every
 * other field instead of relying on a hand-rolled check in the page.
 *
 * The messages are copied verbatim from the inline checks this replaces so no
 * user-facing copy changes. Only the business info step is covered here: the
 * remaining steps keep their existing per-step checks in the page until they
 * are migrated deliberately.
 */
export const businessInfoSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, { message: "Enter a business name with at least 2 characters." }),
  businessType: businessTypeSchema,
  country: z.string().trim().min(1, { message: "Select your country." }),
});

export type BusinessInfoValues = z.infer<typeof businessInfoSchema>;

export const webhookUrlSchema = z
  .string()
  .trim()
  .url({ message: "Enter a valid URL, including https://" })
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const parsed = new URL(val);
        if (parsed.protocol !== "https:") return false;
        
        const hostname = parsed.hostname;
        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname === "[::1]" ||
          hostname === "169.254.169.254" ||
          hostname.startsWith("192.168.") ||
          hostname.startsWith("10.") ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
        ) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    {
      message: "URL must be HTTPS and cannot be a private IP or localhost.",
    }
  );
