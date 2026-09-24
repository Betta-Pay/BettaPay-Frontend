import i18n from '@/lib/i18n/config';
import { paymentLinkSchema } from '@/lib/utils/validation';

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

  describe('localized messages (issue #747)', () => {
    it('resolves domain messages in the active language', async () => {
      await i18n.changeLanguage('fr');

      const result = paymentLinkSchema.safeParse({ label: 'x', type: 'open' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Le libellé doit contenir au moins 2 caractères',
        );
      }
    });

    it('resolves cross-field refinement messages in the active language', async () => {
      await i18n.changeLanguage('pt');

      const result = paymentLinkSchema.safeParse({
        label: 'Fixo',
        type: 'fixed',
        amount: '10',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) => i.message === 'Valor e moeda são obrigatórios para links de valor fixo',
          ),
        ).toBe(true);
      }
    });
  });
});
