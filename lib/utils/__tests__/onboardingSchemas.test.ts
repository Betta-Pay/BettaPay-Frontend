import { accountNumberSchema, bankCodeSchema, bankDetailsSchema } from '../onboardingSchemas';

describe('onboardingSchemas validation', () => {
  describe('accountNumberSchema', () => {
    it('accepts valid 10-digit NUBAN account numbers', () => {
      expect(accountNumberSchema.safeParse('0123456789').success).toBe(true);
      expect(accountNumberSchema.safeParse('2081234567').success).toBe(true);
    });

    it('accepts valid IBAN numbers', () => {
      expect(accountNumberSchema.safeParse('GB82WEST12345698765432').success).toBe(true);
      expect(accountNumberSchema.safeParse('DE89370400440532013000').success).toBe(true);
    });

    it('rejects invalid/mismatched length account strings', () => {
      expect(accountNumberSchema.safeParse('12345').success).toBe(false);
      expect(accountNumberSchema.safeParse('abc').success).toBe(false);
      expect(accountNumberSchema.safeParse('123456789012345678901234567890123456789').success).toBe(false);
    });
  });

  describe('bankCodeSchema', () => {
    it('accepts valid bank codes', () => {
      expect(bankCodeSchema.safeParse('058').success).toBe(true);
      expect(bankCodeSchema.safeParse('GTBIGLA').success).toBe(true);
    });

    it('rejects invalid bank codes', () => {
      expect(bankCodeSchema.safeParse('01').success).toBe(false);
      expect(bankCodeSchema.safeParse('INVALID_BANK_CODE_TOO_LONG').success).toBe(false);
    });
  });

  describe('bankDetailsSchema', () => {
    it('validates complete bank details payload', () => {
      const valid = bankDetailsSchema.safeParse({
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'GTBank',
      });
      expect(valid.success).toBe(true);
    });
  });
});
