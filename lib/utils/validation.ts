import { z } from 'zod';


export const paymentLinkSchema = z.object({
  label: z.string().min(2, 'Label must be at least 2 characters'),
  type: z.enum(['fixed', 'open']),
  amount: z.string().optional(),
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
  websiteUrl: z.string().url('Invalid URL format').nullable().or(z.literal('')),
  contactEmail: z.string().email('Invalid email format'),
  phoneNumber: z.string().nullable().or(z.literal('')),
  logoUrl: z.string().nullable(),
});

export type MerchantProfileFormValues = z.infer<typeof merchantProfileSchema>;
