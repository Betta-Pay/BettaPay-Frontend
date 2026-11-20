import { DEFAULT_SETTINGS, sectionSchemas, fieldErrors } from '../schema';

describe('settings schemas', () => {
  it('accepts every default section', () => {
    for (const [key, schema] of Object.entries(sectionSchemas)) {
      expect(schema.safeParse(DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]).success).toBe(true);
    }
  });

  it('keeps the backend default IP score threshold of 20', () => {
    expect(DEFAULT_SETTINGS.authPolicy.ipScoreThreshold).toBe(20);
  });

  it.each([
    ['fees', { defaultBps: 10001, capUsdc: 250, minFeeUsdc: 0 }, 'defaultBps'],
    ['fees', { defaultBps: 1.5, capUsdc: 250, minFeeUsdc: 0 }, 'defaultBps'],
    ['fees', { defaultBps: 100, capUsdc: 5, minFeeUsdc: 10 }, 'minFeeUsdc'],
    ['fees', { defaultBps: 100, capUsdc: -1, minFeeUsdc: 0 }, 'capUsdc'],
    ['authPolicy', { ipScoreThreshold: 0, lockoutMaxFailures: 5, lockoutMinutes: 15 }, 'ipScoreThreshold'],
    ['rateLimits', { globalRequestsPerMinute: 600, burst: 100, windowSeconds: 0 }, 'windowSeconds'],
    ['maintenance', { enabled: true, message: 'x'.repeat(281), readOnlyMode: false }, 'message'],
  ] as const)('rejects invalid %s input (%#)', (section, value, field) => {
    const r = sectionSchemas[section].safeParse(value);
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)[field]).toBeTruthy();
  });
});
