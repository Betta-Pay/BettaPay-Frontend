import en from "./en.json";
import fr from "./fr.json";
import pt from "./pt.json";
import sw from "./sw.json";

export const supportedLocales = ["en", "fr", "pt", "sw"] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = "en";
export const localeStorageKey = "bettapay-language";

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
  pt: { translation: pt },
  sw: { translation: sw },
};

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes(value as Locale);
}

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
