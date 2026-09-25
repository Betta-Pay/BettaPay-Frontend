import { z } from 'zod';

/**
 * Largest amount a Stellar operation can carry: int64 max stroops / 10^7.
 * Anything above this overflows the Stellar SDK transaction builder.
 */
export const MAX_STELLAR_AMOUNT = 922337203685.4775807;

/**
 * Strict numeric view of an amount (issue #778). `.finite()` rejects the
 * `Infinity` / `NaN` a loose coercion would let through — e.g. a 400-digit
 * string that `parseFloat` turns into `Infinity` and that would otherwise sail
 * past a `> 0` check.
 */
export const finiteAmountNumberSchema = z.coerce
  .number('Amount must be a valid number')
  .finite('Amount must be a finite number')
  .positive('Amount must be strictly positive')
  .max(MAX_STELLAR_AMOUNT, 'Amount exceeds the maximum supported value');

const amountSchema = z.string()
  .regex(/^\d+(\.\d{1,7})?$/, 'Amount must be a valid number with up to 7 decimal places')
  .superRefine((val, ctx) => {
    const result = finiteAmountNumberSchema.safeParse(val);
    if (!result.success) {
      ctx.addIssue({ code: 'custom', message: result.error.issues[0].message });
    }
  });

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
