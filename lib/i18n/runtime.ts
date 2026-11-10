import type { i18n as I18nextInstance } from "i18next";

import i18n from "./config";

/**
 * Tracks the i18next instance that should back non-React translations.
 *
 * The app renders through the instance created by `I18nProvider`, while modules
 * such as `lib/utils/validation.ts` run outside React. This registry lets
 * `I18nProvider` publish its instance so those modules resolve translations in
 * the language the user actually selected. Before the provider mounts (and in
 * Node/tests) it falls back to the bundled default instance from `./config`.
 */
let activeInstance: I18nextInstance = i18n;
const warnedMissingKeys = new Set<string>();

/** Publish the client i18next instance; called once by `I18nProvider`. */
export function setActiveI18nInstance(instance: I18nextInstance): void {
  activeInstance = instance;
}

export function getActiveI18nInstance(): I18nextInstance {
  return activeInstance;
}

export function resetMissingKeyWarnings(): void {
  warnedMissingKeys.clear();
}

/**
 * Check whether `key` exists in the specified (or active) locale dictionary.
 */
export function hasTranslationKey(key: string, locale?: string): boolean {
  const targetLocale = locale ?? activeInstance.language ?? "en";
  if (typeof activeInstance.exists === "function") {
    return activeInstance.exists(key, {
      lng: targetLocale,
      fallbackLng: false,
    });
  }
  return true;
}

/**
 * Emit a formatted development-only warning when a translation key is missing
 * from the active locale dictionary (#921).
 */
export function warnMissingTranslationKey(key: string, locale?: string): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  const targetLocale = locale ?? activeInstance.language ?? "en";
  const dedupeToken = `${targetLocale}:${key}`;
  if (warnedMissingKeys.has(dedupeToken)) {
    return;
  }
  warnedMissingKeys.add(dedupeToken);
  console.warn(`[i18n] Missing translation key "${key}" for locale "${targetLocale}"`);
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/**
 * Translate a key using the active i18next instance at call time, so the
 * current language is honoured on every call rather than being frozen when a
 * schema is defined. Logs missing keys in development mode (#921).
 */
export function translate(key: string, options?: Record<string, unknown>): string {
  const activeLocale =
    (typeof options?.lng === "string" ? options.lng : undefined) ??
    activeInstance.language ??
    "en";

  if (!hasTranslationKey(key, activeLocale)) {
    warnMissingTranslationKey(key, activeLocale);
  }

  const t = activeInstance.t as unknown as TranslateFn;
  return t(key, options);
}
