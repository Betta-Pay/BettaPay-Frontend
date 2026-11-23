import { z } from 'zod';
import { translate } from '@/lib/i18n/runtime';

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
  label: z.string().min(2, {
    error: () => translate('validation.paymentLink.labelMin'),
  }),
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
  error: () => translate('validation.paymentLink.amountCurrencyRequired'),
  path: ["amount"],
});

export type PaymentLinkFormValues = z.infer<typeof paymentLinkSchema>;

const businessTypeEnum = z.enum(['individual', 'sole_proprietor', 'llc', 'corporation']);

/**
 * Parse a value with the WHATWG URL parser and confirm its scheme is allowed.
 * A permissive regex (one that only checks the string starts with "https://")
 * accepts malformed hosts, so real URL parsing must back the check. Rejecting
 * javascript: and data: URIs here closes the redirect-injection hole that
 * z.string().url() alone leaves open (issue #1158).
 */
function isUrlWithProtocol(value: string, allowedProtocols: readonly string[]): boolean {
  try {
    return allowedProtocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export const merchantProfileSchema = z.object({
  businessName: z.string().min(1, {
    error: () => translate('validation.merchantProfile.businessNameRequired'),
  }),
  businessType: businessTypeEnum,
  country: z.string().min(1, {
    error: () => translate('validation.merchantProfile.countryRequired'),
  }),
  industry: z.string().min(1, {
    error: () => translate('validation.merchantProfile.industryRequired'),
  }),
  websiteUrl: z.string().url({
    error: () => translate('validation.merchantProfile.websiteHttps'),
  }).refine(value => isUrlWithProtocol(value, ['https:']), {
    error: () => translate('validation.merchantProfile.websiteHttps'),
  }).or(z.literal('')).nullable(),
  contactEmail: z.string().email({
    error: () => translate('validation.merchantProfile.emailInvalid'),
  }),
  phoneNumber: z.string().nullable().or(z.literal('')),
  logoUrl: z.string().nullable(),
});

export type MerchantProfileFormValues = z.infer<typeof merchantProfileSchema>;

export const editPaymentLinkSchema = z.object({
  label: z.string().min(1, {
    error: () => translate('validation.editPaymentLink.labelRequired'),
  }),
  amount: amountSchema.optional(),
  currency: z.enum(['USDC', 'XLM', 'USDT']).default('USDC'),
  expiry: z.string().optional(),
  redirectUrl: z.string().url({
    error: () => translate('validation.editPaymentLink.urlInvalid'),
  }).refine(value => isUrlWithProtocol(value, ['http:', 'https:']), {
    error: () => translate('validation.editPaymentLink.urlInvalid'),
  }).or(z.literal('')).optional(),
  reference: z.string().optional(),
});

export type EditPaymentLinkFormValues = z.infer<typeof editPaymentLinkSchema>;
