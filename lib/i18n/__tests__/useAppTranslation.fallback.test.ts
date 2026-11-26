/**
 * useAppTranslation before i18next finishes initialising (e.g. during SSR
 * hydration). The English dictionary takes over, so text must still resolve,
 * missing keys must not throw, and variables must still be substituted.
 */
import { renderHook } from '@testing-library/react';
import { useTranslation } from 'react-i18next';

import { useAppTranslation } from '@/lib/i18n/useAppTranslation';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

const mockedUseTranslation = useTranslation as unknown as jest.Mock;

describe('useAppTranslation before initialisation', () => {
  const i18nTranslate = jest.fn(() => 'SHOULD-NOT-BE-USED');

  beforeEach(() => {
    i18nTranslate.mockClear();
    mockedUseTranslation.mockReturnValue({
      t: i18nTranslate,
      i18n: { isInitialized: false },
    });
  });

  it('resolves text from the English dictionary', () => {
    const { result } = renderHook(() => useAppTranslation());
    expect(result.current.t('common.brand')).toBe('BettaPay');
  });

  it('returns the key for a missing translation, without throwing', () => {
    const { result } = renderHook(() => useAppTranslation());
    expect(() => result.current.t('runtime.does.not.exist')).not.toThrow();
    expect(result.current.t('runtime.does.not.exist')).toBe('runtime.does.not.exist');
  });

  it('substitutes interpolation variables', () => {
    const { result } = renderHook(() => useAppTranslation());
    expect(result.current.t('onboarding.stepProgress', { current: 2, total: 5 })).toBe(
      'Step 2 of 5',
    );
  });

  it('keeps a placeholder visible when its variable is not supplied', () => {
    const { result } = renderHook(() => useAppTranslation());
    expect(result.current.t('onboarding.stepProgress', { current: 2 })).toBe(
      'Step 2 of {{total}}',
    );
  });

  it('does not call the i18next t function while uninitialised', () => {
    const { result } = renderHook(() => useAppTranslation());
    result.current.t('common.brand');
    expect(i18nTranslate).not.toHaveBeenCalled();
  });
});
