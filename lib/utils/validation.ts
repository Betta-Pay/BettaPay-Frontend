import { z } from 'zod';

const amountSchema = z.string()
  .regex(/^\d+(\.\d{1,7})?$/, 'Amount must be a valid number with up to 7 decimal places')
  .refine(val => parseFloat(val) > 0, 'Amount must be strictly positive');

export const paymentLinkSchema = z.object({
  label: z.string().min(2, 'Label must be at least 2 characters'),
  type: z.enum(['fixed', 'open']),
  amount: amountSchema.optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
}).refine(data => {
  if (data.type === 'fixed') {
    return !!data.amount && !!data.currency;
  }
  return true;
}, {
  message: "Amount and currency are required for fixed links",
  path: ["amount"],
});

export type PaymentLinkFormValues = z.infer<typeof paymentLinkSchema>;

const businessTypeEnum = z.enum(['individual', 'sole_proprietor', 'llc', 'corporation']);

export const merchantProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  businessType: businessTypeEnum,
  country: z.string().min(1, 'Country is required'),
  industry: z.string().min(1, 'Industry is required'),
  websiteUrl: z.string().regex(/^https:\/\/.*/, 'Website URL must start with https://').or(z.literal('')).nullable(),
  contactEmail: z.string().email('Invalid email format'),
  phoneNumber: z.string().nullable().or(z.literal('')),
  logoUrl: z.string().nullable(),
});

export type MerchantProfileFormValues = z.infer<typeof merchantProfileSchema>;

export const editPaymentLinkSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  amount: amountSchema.optional(),
  currency: z.enum(['USDC', 'XLM', 'USDT']).default('USDC'),
  expiry: z.string().optional(),
  redirectUrl: z.string().url('Invalid URL').or(z.literal('')).optional(),
  reference: z.string().optional(),
});

export type EditPaymentLinkFormValues = z.infer<typeof editPaymentLinkSchema>;
