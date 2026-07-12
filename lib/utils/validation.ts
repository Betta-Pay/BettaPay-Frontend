import { z } from 'zod';

const passwordRequirements = [
  { label: 'At least 8 characters', regex: /.{8,}/ },
  { label: 'One uppercase letter', regex: /[A-Z]/ },
  { label: 'One lowercase letter', regex: /[a-z]/ },
  { label: 'One digit', regex: /[0-9]/ },
  { label: 'One special character (!@#$%^&*)', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ },
] as const;

export type PasswordRequirement = typeof passwordRequirements[number];
export { passwordRequirements };

function validatePassword(password: string): string[] {
  return passwordRequirements
    .filter(({ regex }) => !regex.test(password))
    .map(({ label }) => label);
}

export const strongPasswordSchema = z.string().superRefine((password, ctx) => {
  const unmet = validatePassword(password);
  if (unmet.length > 0) {
    ctx.addIssue({
      code: 'custom' as const,
      message: `Password must include: ${unmet.join(', ')}`,
    });
  }
});

export const loginSchema = z.object({
  merchantId: z.string().min(1, 'Merchant ID is required'),
  secret: z.string().min(1, 'Secret key is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: strongPasswordSchema,
  country: z.string({ error: 'Country is required' }).min(1, 'Country is required'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

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
