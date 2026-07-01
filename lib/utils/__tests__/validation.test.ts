import { loginSchema, registerSchema, paymentLinkSchema } from '@/lib/utils/validation';

describe('utils/validation', () => {
  describe('loginSchema', () => {
    it('accepts valid inputs', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'Aa1!aaaa', // meets: 8+, upper, lower, digit, special
      });

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.email).toBe('test@example.com');
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'Aa1!aaaa',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('valid email address'))).toBe(true);
      }
    });

    it('rejects passwords missing requirements', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'aaaaaaaa', // too short (also missing uppercase/digit/special)
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // strongPasswordSchema sets message: `Password must include: ...`
        expect(result.error.issues.some((i) => i.message.startsWith('Password must include:'))).toBe(true);
      }
    });
  });

  describe('registerSchema', () => {
    it('accepts valid inputs', () => {
      const result = registerSchema.safeParse({
        businessName: 'BettaPay',
        email: 'test@example.com',
        password: 'Aa1!aaaa',
        country: 'Nigeria',
      });

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.businessName).toBe('BettaPay');
    });

    it('rejects businessName shorter than 2 chars', () => {
      const result = registerSchema.safeParse({
        businessName: 'A',
        email: 'test@example.com',
        password: 'Aa1!aaaa',
        country: 'Nigeria',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('Business name must be at least 2 characters'))).toBe(true);
      }
    });

    it('rejects missing/empty country', () => {
      const result = registerSchema.safeParse({
        businessName: 'BettaPay',
        email: 'test@example.com',
        password: 'Aa1!aaaa',
        country: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // country schema uses min(1, 'Country is required')
        expect(result.error.issues.some((i) => i.message === 'Country is required')).toBe(true);
      }
    });
  });

  describe('paymentLinkSchema refinement', () => {
    it('allows open links without amount/currency', () => {
      const result = paymentLinkSchema.safeParse({
        label: 'Open Link',
        type: 'open',
      });

      expect(result.success).toBe(true);
    });

    it('requires amount and currency for fixed links', () => {
      const result = paymentLinkSchema.safeParse({
        label: 'Fixed Link',
        type: 'fixed',
        amount: '10',
        currency: 'USDC',
      });

      expect(result.success).toBe(true);
    });

    it('fails fixed links when amount is missing', () => {
      const result = paymentLinkSchema.safeParse({
        label: 'Fixed Link',
        type: 'fixed',
        currency: 'USDC',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // refinement path: ['amount']
        expect(result.error.issues.some((i) => i.path?.[0] === 'amount')).toBe(true);
        expect(result.error.issues.some((i) => i.message.includes('Amount and currency are required'))).toBe(true);
      }
    });

    it('fails fixed links when currency is missing (refinement still points to amount)', () => {
      const result = paymentLinkSchema.safeParse({
        label: 'Fixed Link',
        type: 'fixed',
        amount: '10',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path?.[0] === 'amount')).toBe(true);
      }
    });

    it('treats empty strings as missing for fixed links', () => {
      const result = paymentLinkSchema.safeParse({
        label: 'Fixed Link',
        type: 'fixed',
        amount: '',
        currency: '',
      });

      expect(result.success).toBe(false);
    });
  });
});