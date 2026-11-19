import { decodeJwtPayload, isJwtExpiredOrInvalid, base64UrlDecode } from '@/lib/utils/jwt';

function base64Url(value: object | string): string {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  return Buffer.from(json, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(
  payload: Record<string, unknown>,
  header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' },
  signature = 'c2lnbmF0dXJl'
): string {
  return `${base64Url(header)}.${base64Url(payload)}.${signature}`;
}

const inOneHour = Math.floor(Date.now() / 1000) + 3600;
const anHourAgo = Math.floor(Date.now() / 1000) - 3600;

describe('decodeJwtPayload', () => {
  it('accepts a well-formed, unexpired token', () => {
    const result = decodeJwtPayload(makeToken({ exp: inOneHour, merchantId: 'm_1' }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.merchantId).toBe('m_1');
      expect(result.payload.exp).toBe(inOneHour);
    }
  });

  it('rejects an expired token', () => {
    const result = decodeJwtPayload(makeToken({ exp: anHourAgo }));

    expect(result).toMatchObject({ ok: false, error: 'expired' });
  });

  it('rejects a token with no expiry claim', () => {
    const result = decodeJwtPayload(makeToken({ merchantId: 'm_1' }));

    expect(result).toMatchObject({ ok: false, error: 'missing_expiry' });
  });

  it('accepts a token with no expiry when explicitly allowed', () => {
    const result = decodeJwtPayload(makeToken({ merchantId: 'm_1' }), {
      allowMissingExpiry: true,
    });

    expect(result.ok).toBe(true);
  });

  it('rejects the alg:none forgery', () => {
    const result = decodeJwtPayload(
      makeToken({ exp: inOneHour, role: 'admin' }, { alg: 'none' }, '')
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(['unsupported_alg', 'missing_signature']).toContain(result.error);
    }
  });

  it('rejects a token whose signature segment is empty', () => {
    const result = decodeJwtPayload(
      makeToken({ exp: inOneHour }, { alg: 'HS256' }, '')
    );

    expect(result).toMatchObject({ ok: false, error: 'missing_signature' });
  });

  it('rejects an unrecognised algorithm', () => {
    const result = decodeJwtPayload(
      makeToken({ exp: inOneHour }, { alg: 'MADEUP256' })
    );

    expect(result).toMatchObject({ ok: false, error: 'unsupported_alg' });
  });

  it('rejects structurally malformed tokens without throwing', () => {
    expect(decodeJwtPayload('not-a-jwt')).toMatchObject({ ok: false, error: 'malformed' });
    expect(decodeJwtPayload('a.b')).toMatchObject({ ok: false, error: 'malformed' });
    expect(decodeJwtPayload('')).toMatchObject({ ok: false, error: 'malformed' });
  });

  it('rejects a tampered payload segment that no longer parses as JSON', () => {
    const token = makeToken({ exp: inOneHour });
    const [header, , signature] = token.split('.');
    const tampered = `${header}.${base64Url('definitely not json')}.${signature}`;

    expect(decodeJwtPayload(tampered)).toMatchObject({ ok: false, error: 'malformed' });
  });

  it('rejects a token that is not yet valid', () => {
    const result = decodeJwtPayload(
      makeToken({ exp: inOneHour, nbf: Math.floor(Date.now() / 1000) + 600 })
    );

    expect(result).toMatchObject({ ok: false, error: 'not_yet_valid' });
  });

  it('rejects an unexpected issuer when one is configured', () => {
    const result = decodeJwtPayload(makeToken({ exp: inOneHour, iss: 'evil.example' }), {
      expectedIssuer: 'https://auth.bettapay.io',
    });

    expect(result).toMatchObject({ ok: false, error: 'issuer_mismatch' });
  });

  it('accepts a matching issuer', () => {
    const result = decodeJwtPayload(
      makeToken({ exp: inOneHour, iss: 'https://auth.bettapay.io' }),
      { expectedIssuer: 'https://auth.bettapay.io' }
    );

    expect(result.ok).toBe(true);
  });

  it('accurately decodes JWT claims containing UTF-8 multibyte characters', () => {
    const claims = {
      exp: inOneHour,
      merchantName: 'Café de Paris & Élégance',
      currencySymbol: '₦',
      cjkTitle: '日本語の店舗名',
      chineseCity: '上海市',
      description: 'Payment for services 🚀',
    };

    const token = makeToken(claims);
    const result = decodeJwtPayload(token);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.merchantName).toBe('Café de Paris & Élégance');
      expect(result.payload.currencySymbol).toBe('₦');
      expect(result.payload.cjkTitle).toBe('日本語の店舗名');
      expect(result.payload.chineseCity).toBe('上海市');
      expect(result.payload.description).toBe('Payment for services 🚀');
    }
  });

  it('rejects tokens with malformed base64url characters without throwing', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiJ9.invalid%base64%content.sig';
    const result = decodeJwtPayload(invalidToken);
    expect(result).toMatchObject({ ok: false, error: 'malformed' });
  });

  it('tolerates small clock skew around expiry', () => {
    const justExpired = Math.floor(Date.now() / 1000) - 5;

    expect(decodeJwtPayload(makeToken({ exp: justExpired })).ok).toBe(true);
    expect(
      decodeJwtPayload(makeToken({ exp: justExpired }), { clockToleranceSeconds: 0 })
    ).toMatchObject({ ok: false, error: 'expired' });
  });

  it('never throws, whatever it is given', () => {
    expect(() => decodeJwtPayload(undefined as unknown as string)).not.toThrow();
    expect(() => decodeJwtPayload('...')).not.toThrow();
  });
});

describe('isJwtExpiredOrInvalid', () => {
  it('is true for absent, expired and malformed tokens', () => {
    expect(isJwtExpiredOrInvalid(null)).toBe(true);
    expect(isJwtExpiredOrInvalid(undefined)).toBe(true);
    expect(isJwtExpiredOrInvalid('')).toBe(true);
    expect(isJwtExpiredOrInvalid('garbage')).toBe(true);
    expect(isJwtExpiredOrInvalid(makeToken({ exp: anHourAgo }))).toBe(true);
  });

  it('is false for a well-formed, unexpired token', () => {
    expect(isJwtExpiredOrInvalid(makeToken({ exp: inOneHour }))).toBe(false);
  });
});

describe('base64UrlDecode', () => {
  it('decodes ASCII strings', () => {
    const input = base64Url('Hello, world!');
    expect(base64UrlDecode(input)).toBe('Hello, world!');
  });

  it('decodes UTF-8 multibyte characters accurately', () => {
    const text = 'Café ₦50,000 日本語 中文 🚀';
    const input = base64Url(text);
    expect(base64UrlDecode(input)).toBe(text);
  });

  it('returns null on malformed base64url input without throwing', () => {
    expect(base64UrlDecode('invalid%base64!')).toBeNull();
    expect(base64UrlDecode('===bad-padding===')).toBeNull();
    // @ts-expect-error test non-string input
    expect(base64UrlDecode(12345)).toBeNull();
    // @ts-expect-error test null input
    expect(base64UrlDecode(null)).toBeNull();
  });
});
