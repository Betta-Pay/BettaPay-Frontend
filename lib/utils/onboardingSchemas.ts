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
