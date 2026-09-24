import { z } from 'zod';

import { translate } from '@/lib/i18n/runtime';
// Installs Zod's global error map so built-in messages localize too (issue #747).
import '@/lib/i18n/zod';

const amountSchema = z.string()
  .regex(/^\d+(\.\d{1,7})?$/, {
    error: () => translate('validation.paymentLink.amountValid'),
  })
  .refine(val => parseFloat(val) > 0, {
    error: () => translate('validation.paymentLink.amountPositive'),
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
  websiteUrl: z.string().regex(/^https:\/\/.*/, {
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
  }).or(z.literal('')).optional(),
  reference: z.string().optional(),
});

export type EditPaymentLinkFormValues = z.infer<typeof editPaymentLinkSchema>;
