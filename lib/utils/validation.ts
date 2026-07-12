import { z } from 'zod';


export const passwordRequirements = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /\d/, label: 'One number' },
  { regex: /[^a-zA-Z0-9]/, label: 'One special character' },
] as const;

export const strongPasswordSchema = z
  .string()
  .min(8)
  .refine((val) => /[A-Z]/.test(val), { message: 'Password must include: uppercase letter' })
  .refine((val) => /[a-z]/.test(val), { message: 'Password must include: lowercase letter' })
  .refine((val) => /\d/.test(val), { message: 'Password must include: number' })
  .refine((val) => /[^a-zA-Z0-9]/.test(val), { message: 'Password must include: special character' });


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
