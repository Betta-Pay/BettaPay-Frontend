import {
  shouldWarnMissingGoogleClientId,
  warnMissingGoogleClientId,
  warnDevDeprecation,
  __resetGoogleWarnForTests,
} from '@/lib/utils/googleWarn';

describe('utils/googleWarn (#917)', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    __resetGoogleWarnForTests();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    __resetGoogleWarnForTests();
  });

  it('emits missing Google client ID warning once in development', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(warnMissingGoogleClientId()).toBe(true);
    expect(warnMissingGoogleClientId()).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('suppresses missing Google client ID warnings in production builds', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(shouldWarnMissingGoogleClientId()).toBe(false);
    expect(warnMissingGoogleClientId()).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('suppresses development deprecation warnings in production and deduplicates in dev', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    expect(warnDevDeprecation('google-font-v1', 'Deprecated font weight')).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();

    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    expect(warnDevDeprecation('google-font-v1', 'Deprecated font weight')).toBe(true);
    expect(warnDevDeprecation('google-font-v1', 'Deprecated font weight')).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
