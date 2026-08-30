/**
 * Locale constants and helpers.
 *
 * This module is intentionally free of side effects (it does not import or
 * initialise i18next), so it can be consumed by pure utilities such as
 * `lib/utils/format.ts`, the dev-only coverage panel, and Node scripts without
 * bootstrapping the whole i18n runtime.
 */

export const supportedLocales = ["en", "fr", "pt", "sw"] as const;
export type Locale = (typeof supportedLocales)[number];

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
 * Resolve an arbitrary language tag (e.g. `fr-FR`, `pt`, `de`) to a supported
 * app locale, falling back to {@link defaultLocale} when unsupported.
 */
export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) return defaultLocale;
  const base = value.toLowerCase().split("-")[0];
  return isSupportedLocale(base) ? base : defaultLocale;
}
