import i18next from 'i18next';

import en from '@/lib/i18n/en.json';
import fr from '@/lib/i18n/fr.json';
import i18n from '@/lib/i18n/config';
import { getActiveI18nInstance, setActiveI18nInstance, translate } from '@/lib/i18n/runtime';

afterEach(() => setActiveI18nInstance(i18n));

describe('i18n runtime', () => {
  it('uses the bundled instance until a provider publishes its own', () => {
    expect(getActiveI18nInstance()).toBe(i18n);
  });

  it('translates through the active instance', () => {
    expect(translate('common.brand')).toBe('BettaPay');
  });

  it('returns the key itself for a missing translation, without throwing', () => {
    expect(() => translate('runtime.does.not.exist')).not.toThrow();
    expect(translate('runtime.does.not.exist')).toBe('runtime.does.not.exist');
  });

  it('substitutes interpolation variables', () => {
    expect(translate('onboarding.stepProgress', { current: 2, total: 5 })).toBe('Step 2 of 5');
  });

  it('leaves a placeholder with no supplied value visible rather than blank', () => {
    expect(translate('onboarding.stepProgress', { current: 2 })).toBe('Step 2 of {{total}}');
  });

  it('follows the language of the instance it is given', async () => {
    const french = i18next.createInstance();
    await french.init({
      lng: 'fr',
      fallbackLng: 'en',
      resources: { en: { translation: en }, fr: { translation: fr } },
      interpolation: { escapeValue: false },
    });
    setActiveI18nInstance(french);

    const expected = (fr.onboarding.stepProgress as string)
      .replace('{{current}}', '2')
      .replace('{{total}}', '5');
    expect(translate('onboarding.stepProgress', { current: 2, total: 5 })).toBe(expected);
    expect(expected).not.toBe('Step 2 of 5');
  });
});
