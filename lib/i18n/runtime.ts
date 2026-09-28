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

/** Publish the client i18next instance; called once by `I18nProvider`. */
export function setActiveI18nInstance(instance: I18nextInstance): void {
  activeInstance = instance;
}

export function getActiveI18nInstance(): I18nextInstance {
  return activeInstance;
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/**
 * Translate a key using the active i18next instance at call time, so the
 * current language is honoured on every call rather than being frozen when a
 * schema is defined.
 */
export function translate(key: string, options?: Record<string, unknown>): string {
  const t = activeInstance.t as unknown as TranslateFn;
  return t(key, options);
}
