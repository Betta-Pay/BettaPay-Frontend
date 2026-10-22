import { z } from "zod";

/**
 * Form schema for the admin create/edit dialog. Mirrors the backend's
 * `CreateSupportedAssetBody` (code, name, contractId, decimals, isActive) with
 * tighter client-side rules so obvious mistakes never leave the browser.
 */
export const assetFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Enter an asset code.")
    .max(12, "Use 12 characters or fewer.")
    .regex(/^[A-Z0-9]+$/, "Use capital letters and digits only."),
  name: z.string().trim().min(1, "Enter a display name.").max(60, "Use 60 characters or fewer."),
  issuer: z
    .string()
    .trim()
    .min(1, "Enter the issuer or contract ID.")
    .max(128, "That ID is too long.")
    .regex(/^\S+$/, "The ID can't contain spaces."),
  decimals: z
    .number({ message: "Enter a whole number." })
    .int("Enter a whole number.")
    .min(0, "Decimals can't be negative.")
    .max(18, "Use 18 or fewer decimals."),
  enabled: z.boolean(),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;
