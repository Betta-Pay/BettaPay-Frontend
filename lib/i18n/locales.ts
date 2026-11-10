/**
 * Locale constants and helpers.
 *
 * This module is intentionally free of side effects (it does not import or
 * initialise i18next), so it can be consumed by pure utilities such as
 * `lib/utils/format.ts`, the dev-only coverage panel, and Node scripts without
 * bootstrapping the whole i18n runtime.
 */

import en from "./en.json";

export const supportedLocales = ["en", "fr", "pt", "sw"] as const;
export type Locale = (typeof supportedLocales)[number];
export type LocaleDictionary = Record<string, unknown>;

/** Hard fallback used when nothing else resolves. */
export const FALLBACK_LOCALE: Locale = "en";

/**
 * Default app locale (issue #494). Optionally overridden by
 * `NEXT_PUBLIC_DEFAULT_LOCALE` (must be one of {@link supportedLocales});
 * an unset or invalid value falls back to `en` with a dev warning, so the
 * `LanguageSelector` and SSR always have a sane default and never no-op.
 * Documented in `.env.example` and the README.
 */
function resolveDefaultLocale(): Locale {
  const configured = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  if (configured && supportedLocales.includes(configured as Locale)) {
    return configured as Locale;
  }
  if (configured && process.env.NODE_ENV === "development") {
    console.warn(
      `[i18n] NEXT_PUBLIC_DEFAULT_LOCALE="${configured}" is not a supported ` +
        `locale (${supportedLocales.join(", ")}); using "${FALLBACK_LOCALE}".`,
    );
  }
  return FALLBACK_LOCALE;
}

export const defaultLocale: Locale = resolveDefaultLocale();

/** localStorage key used to persist the user's chosen language. */
export const localeStorageKey = "bettapay-language";

/**
 * Cookie set by the locale middleware so the server and client can both
 * resolve the active locale without relying solely on localStorage (which
 * is unavailable during SSR).
 */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Map each supported app locale to a BCP-47 tag for `Intl` number/date
 * formatting. `en` maps to `en-US` so existing formatting output is unchanged.
 */
export const intlLocales: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  pt: "pt-BR",
  sw: "sw-KE",
};

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes(value as Locale);
}

/**
 * Strip a supported locale prefix from a pathname, e.g. `/en/dashboard` →
 * `/dashboard` and `/fr` → `/`. Pathnames without a supported prefix (and the
 * bare root) are returned unchanged.
 */
export function stripLocalePrefix(pathname: string): string {
  const [leading, ...segments] = pathname.split("/");
  if (leading !== "" || !isSupportedLocale(segments[0])) {
    return pathname;
  }
  const stripped = `/${segments.slice(1).join("/")}`;
  return stripped === "/" ? "/" : stripped;
}

/**
 * Writing direction used by the `dir` attribute on `<html>` (issue #744).
 * `ltr` covers every currently supported locale; RTL languages (e.g. Arabic,
 * Hebrew) are resolved by their base ISO 639-1 code so the document direction
 * flips automatically the moment such a locale is added to
 * {@link supportedLocales}. Mirrors i18next's own RTL detection.
 */
export type Direction = "ltr" | "rtl";

const RTL_LANGUAGE_CODES = new Set([
  "ar", // Arabic
  "ckb", // Central Kurdish
  "dv", // Divehi
  "fa", // Persian
  "he", // Hebrew
  "ku", // Kurdish
  "ps", // Pashto
  "sd", // Sindhi
  "ug", // Uyghur
  "ur", // Urdu
  "yi", // Yiddish
]);

export function getLocaleDirection(locale: string | null | undefined): Direction {
  if (!locale) return "ltr";
  const base = locale.toLowerCase().split("-")[0];
  return RTL_LANGUAGE_CODES.has(base) ? "rtl" : "ltr";
}

/**
 * Resolve an arbitrary language tag (e.g. `fr-FR`, `pt`, `de`) to a supported
 * app locale, falling back to {@link defaultLocale} when unsupported.
 */
export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) return defaultLocale;
  const base = value.toLowerCase().split("-")[0];
  return isSupportedLocale(base) ? base : defaultLocale;
}

const localeDictionaryCache = new Map<Locale, LocaleDictionary>([
  ["en", en as LocaleDictionary],
]);

/**
 * Return the in-memory cached dictionary for `locale` if already loaded.
 * English (`en`) is always available synchronously by default.
 */
export function getCachedLocaleDictionary(locale: Locale): LocaleDictionary | undefined {
  return localeDictionaryCache.get(locale);
}

/**
 * Reset the in-memory locale dictionary cache back to only the default `en`
 * bundle (primarily used in tests).
 */
export function clearLocaleDictionaryCache(): void {
  localeDictionaryCache.clear();
  localeDictionaryCache.set("en", en as LocaleDictionary);
}

/**
 * Asynchronously load a locale dictionary on demand via dynamic `import()` and
 * cache the resolved dictionary in memory (#922).
 */
export async function loadLocaleDictionary(
  locale: string | null | undefined,
): Promise<LocaleDictionary> {
  const target = resolveLocale(locale);
  const cached = localeDictionaryCache.get(target);
  if (cached) {
    return cached;
  }

  let dictionary: LocaleDictionary;
  switch (target) {
    case "fr": {
      const mod = await import("./fr.json");
      dictionary = (mod.default ?? mod) as LocaleDictionary;
      break;
    }
    case "pt": {
      const mod = await import("./pt.json");
      dictionary = (mod.default ?? mod) as LocaleDictionary;
      break;
    }
    case "sw": {
      const mod = await import("./sw.json");
      dictionary = (mod.default ?? mod) as LocaleDictionary;
      break;
    }
    case "en":
    default:
      dictionary = en as LocaleDictionary;
      break;
  }

  localeDictionaryCache.set(target, dictionary);
  return dictionary;
}
