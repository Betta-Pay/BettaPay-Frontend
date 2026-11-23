import i18n from '@/lib/i18n/config';
import {
  paymentLinkSchema,
  editPaymentLinkSchema,
  merchantProfileSchema,
  finiteAmountNumberSchema,
  MAX_STELLAR_AMOUNT,
} from '@/lib/utils/validation';

describe('utils/validation', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
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

  describe('amount finiteness (issue #778)', () => {
    const fixed = (amount: string) =>
      paymentLinkSchema.safeParse({ label: 'Fixed Link', type: 'fixed', amount, currency: 'USDC' });

    it.each(['Infinity', '-Infinity', 'NaN', '1e400', 'abc'])('rejects %s', (amount) => {
      expect(fixed(amount).success).toBe(false);
      expect(editPaymentLinkSchema.safeParse({ label: 'Link', amount }).success).toBe(false);
    });

    it('rejects digit strings that parseFloat overflows to Infinity', () => {
      const huge = '9'.repeat(400);
      expect(Number.isFinite(parseFloat(huge))).toBe(false);
      expect(fixed(huge).success).toBe(false);
    });

    it('rejects amounts above the Stellar int64 limit', () => {
      expect(fixed('922337203686').success).toBe(false);
    });

    it('rejects zero', () => {
      expect(fixed('0').success).toBe(false);
      expect(fixed('0.0000000').success).toBe(false);
    });

    it('accepts ordinary decimal amounts up to 7 places', () => {
      expect(fixed('12.5').success).toBe(true);
      expect(fixed('0.0000001').success).toBe(true);
      expect(fixed('922337203685').success).toBe(true);
    });

    it('finiteAmountNumberSchema blocks non-finite numbers directly', () => {
      expect(finiteAmountNumberSchema.safeParse(Infinity).success).toBe(false);
      expect(finiteAmountNumberSchema.safeParse(NaN).success).toBe(false);
      expect(finiteAmountNumberSchema.safeParse(MAX_STELLAR_AMOUNT + 1).success).toBe(false);
      expect(finiteAmountNumberSchema.safeParse('42.1234567').success).toBe(true);
    });
  });

  describe('URL validation (issue #1158)', () => {
    const validMerchant = {
      businessName: 'Acme Ltd',
      businessType: 'llc' as const,
      country: 'NG',
      industry: 'retail',
      contactEmail: 'owner@acme.com',
      phoneNumber: '',
      logoUrl: null,
    };

    const merchantWithWebsite = (websiteUrl: string | null) =>
      merchantProfileSchema.safeParse({ ...validMerchant, websiteUrl });

    const linkWithRedirect = (redirectUrl: string) =>
      editPaymentLinkSchema.safeParse({ label: 'Link', redirectUrl });

    it('rejects a malformed "https://" string for websiteUrl', () => {
      expect(merchantWithWebsite('https://not a valid url').success).toBe(false);
    });

    it('rejects non-https protocols for websiteUrl', () => {
      expect(merchantWithWebsite('http://example.com').success).toBe(false);
      expect(merchantWithWebsite('ftp://example.com').success).toBe(false);
      expect(merchantWithWebsite('javascript:alert(1)').success).toBe(false);
    });

    it('accepts valid https URLs plus empty string and null for websiteUrl', () => {
      expect(merchantWithWebsite('https://example.com').success).toBe(true);
      expect(merchantWithWebsite('').success).toBe(true);
      expect(merchantWithWebsite(null).success).toBe(true);
    });

    it('rejects javascript: and data: redirect URLs', () => {
      expect(linkWithRedirect('javascript:alert(1)').success).toBe(false);
      expect(linkWithRedirect('data:text/html,<h1>x</h1>').success).toBe(false);
    });

    it('accepts http/https redirect URLs, empty strings and omission', () => {
      expect(linkWithRedirect('https://example.com').success).toBe(true);
      expect(linkWithRedirect('http://example.com').success).toBe(true);
      expect(linkWithRedirect('').success).toBe(true);
      expect(editPaymentLinkSchema.safeParse({ label: 'Link' }).success).toBe(true);
    });
  });
});
