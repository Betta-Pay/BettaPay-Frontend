import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import fr from "./fr.json";
import pt from "./pt.json";
import sw from "./sw.json";
import {
  defaultLocale,
  isSupportedLocale,
  localeStorageKey,
  supportedLocales,
  type Locale,
} from "./locales";

// Re-export the shared locale constants so existing importers that reference
// them from "@/lib/i18n/config" keep working. New code may import directly
// from "@/lib/i18n/locales" to avoid pulling in the i18next runtime.
export { defaultLocale, isSupportedLocale, localeStorageKey, supportedLocales };
export type { Locale };

/**
 * Bundled translation resources — the single source of truth for every locale.
 *
 * Dictionaries live only under `lib/i18n/<locale>.json` (one file per locale,
 * each the `translation` namespace) and are compiled into the bundle. There is
 * no separate `public/locales` copy to drift out of sync, and a CI parity check
 * (`npm run i18n:check`) fails the build if any locale's key set diverges from
 * `en.json`.
 */
export const fallbackResources = {
  en: { translation: en },
  fr: { translation: fr },
  pt: { translation: pt },
  sw: { translation: sw },
};

i18n
  .use(initReactI18next)
  .init({
    fallbackLng: defaultLocale,
    supportedLngs: [...supportedLocales],
    ns: ["translation"],
    defaultNS: "translation",

    // Dictionaries are bundled directly; no runtime HTTP fetching.
    resources: fallbackResources,

    // Never return null for a missing key — return the key itself so
    // missing translations are visible in the UI rather than silently blank.
    returnNull: false,

    // Don't escape values for HTML (React handles this)
    interpolation: {
      escapeValue: false,
    },

    // Return the key itself for a missing translation so the raw key is never
    // rendered as a blank string; the dev coverage panel surfaces these.
    parseMissingKeyHandler: (key: string) => key,

    // Log missing keys in development so locale drift is visible during work,
    // not just in the CI parity check (issue #493). `npm run i18n:check`
    // remains the hard gate.
    saveMissing: process.env.NODE_ENV === "development",
    missingKeyHandler: (lngs: readonly string[], _ns: string, key: string) => {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[i18n] missing key "${key}" for locale(s) ${lngs.join(", ")}`);
      }
    },

    // React-specific: skip suspending on initial load
    react: {
      useSuspense: false,
    },
  });

export const resources = fallbackResources;

export function detectPreferredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const storedLocale = window.localStorage.getItem(localeStorageKey);
  if (isSupportedLocale(storedLocale)) return storedLocale;

  for (const language of window.navigator.languages ?? [window.navigator.language]) {
    const locale = language.toLowerCase().split("-")[0];
    if (isSupportedLocale(locale)) return locale;
  }
  return defaultLocale;
}

export default i18n;
