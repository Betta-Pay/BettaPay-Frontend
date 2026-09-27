import {
  defaultLocale,
  intlLocales,
  resolveLocale,
  type Locale,
} from '@/lib/i18n/locales';

/**
 * Resolve the currently active app locale.
 *
 * Reads `document.documentElement.lang`, which `I18nProvider` and
 * `LanguageSelector` keep in sync with the selected language. Falls back to the
 * default locale on the server or when the value is missing/unsupported.
 */
export const getActiveLocale = (): Locale => {
  if (typeof document === 'undefined') return defaultLocale;
  return resolveLocale(document.documentElement.lang);
};

/** Map an optional app locale (or the active one) to a BCP-47 tag for `Intl`. */
export const toIntlLocale = (locale?: string): string =>
  intlLocales[locale ? resolveLocale(locale) : getActiveLocale()];

/** Values at or above this magnitude are compacted (T / Q suffixes). */
const ABBREVIATION_THRESHOLD = 1e12;

export interface FormatCurrencyOptions {
  /** App locale (`en`/`fr`/`pt`/`sw`) or BCP-47 tag. Defaults to the active locale. */
  locale?: string;
  /**
   * When false, omit fractional digits for non-NGN amounts that would otherwise
   * render as whole numbers (e.g. `USDC 1,250` instead of `USDC 1,250.00`).
   * NGN already omits forced decimals via Intl.
   */
  showDecimals?: boolean;
  /**
   * When true (default), compact extreme magnitudes (≥ 1T) with a T/Q suffix.
   * Set false to always render the full number.
   */
  abbreviate?: boolean;
}

function resolveCurrencyOptions(
  localeOrOptions?: string | FormatCurrencyOptions,
): Required<Pick<FormatCurrencyOptions, 'showDecimals' | 'abbreviate'>> & {
  locale?: string;
} {
  if (typeof localeOrOptions === 'string' || localeOrOptions === undefined) {
    return {
      locale: localeOrOptions,
      showDecimals: true,
      abbreviate: true,
    };
  }
  return {
    locale: localeOrOptions.locale,
    showDecimals: localeOrOptions.showDecimals ?? true,
    abbreviate: localeOrOptions.abbreviate ?? true,
  };
}

function formatAbbreviatedAmount(
  amount: number,
  currency: string,
  intlLocale: string,
): string | null {
  const abs = Math.abs(amount);
  if (abs < ABBREVIATION_THRESHOLD) return null;

  const sign = amount < 0 ? '-' : '';
  let divisor = 1;
  let suffix = '';

  if (abs >= 1e15) {
    divisor = 1e15;
    suffix = 'Q';
  } else if (abs >= 1e12) {
    divisor = 1e12;
    suffix = 'T';
  } else {
    return null;
  }

  const formatted = new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs / divisor);

  if (currency === 'NGN') {
    return `${sign}₦${formatted}${suffix}`;
  }
  return `${sign}USDC ${formatted}${suffix}`;
}

/**
 * Shared locale-aware currency formatter used by `CurrencyDisplay`, charts,
 * tables, and wallet surfaces. All money rendering should go through this
 * (or `formatNumber`) so grouping, precision, and symbols stay consistent.
 *
 * The third argument accepts either a locale string (legacy) or an options
 * object — both resolve through the same `Intl.NumberFormat` pipeline.
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USDC',
  localeOrOptions?: string | FormatCurrencyOptions,
) => {
  // Normalize floating-point residuals that would otherwise render as -0.00.
  if (Math.abs(amount) < 0.005) amount = 0;

  const opts = resolveCurrencyOptions(localeOrOptions);
  const base = opts.locale ? resolveLocale(opts.locale) : getActiveLocale();
  const intlLocale = intlLocales[base];

  if (opts.abbreviate) {
    const abbreviated = formatAbbreviatedAmount(amount, currency, intlLocale);
    if (abbreviated) return abbreviated;
  }

  if (currency === 'NGN') {
    // `en` keeps the `en-NG` tag so the ₦ symbol renders; other locales format
    // the amount using their own grouping/decimal conventions.
    const ngnLocale = base === 'en' ? 'en-NG' : intlLocale;
    return new Intl.NumberFormat(ngnLocale, {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // USDC (and other non-ISO tokens) format the number in the active locale and
  // prefix the ticker. The sign stays ahead of the ticker to match established
  // output (e.g. "-USDC 50.00").
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const useDecimals = opts.showDecimals || abs % 1 !== 0;
  const value = new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: useDecimals ? 2 : 0,
    maximumFractionDigits: useDecimals ? 2 : 0,
  }).format(abs);
  return `${sign}USDC ${value}`;
};

/** ISO 4217 alphabetic codes are exactly three letters — the only shape `Intl` accepts. */
const ISO_CURRENCY_CODE = /^[A-Za-z]{3}$/;

/** Formatters are immutable, so one per (locale, currency) pair is reused. */
const fiatFormatterCache = new Map<string, Intl.NumberFormat>();

/** Currencies whose CLDR minor unit is the major unit, so cents are noise. */
const ZERO_DECIMAL_FIAT = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'XAF', 'XOF', 'XPF']);

/**
 * Whether a value is usable as an ISO 4217 currency code. Guards against
 * `Intl.NumberFormat` throwing a `RangeError` on untrusted API payloads.
 */
export const isSupportedFiatCurrency = (currency: unknown): currency is string => {
  if (typeof currency !== 'string') return false;
  const code = currency.trim();
  if (!ISO_CURRENCY_CODE.test(code)) return false;
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: code }).format(0);
    return true;
  } catch {
    return false;
  }
};

/**
 * Format a fiat amount with the active locale's native symbol placement via
 * `Intl.NumberFormat({ style: 'currency' })`, so the symbol is correct for
 * *any* ISO 4217 currency (€, ₦, $, £, …) instead of a hardcoded one.
 *
 * Unlike {@link formatCurrency}, the currency is never assumed to be NGN or
 * USDC, so any fiat representation should go through this helper rather than
 * concatenating a symbol by hand. Falls back to `NGN` when the supplied code is
 * missing or malformed so a bad payload degrades instead of throwing.
 */
export const formatFiat = (
  amount: number,
  currency: string = 'NGN',
  locale?: string,
): string => {
  // Normalize floating-point residuals that would otherwise render as -0.
  const safeAmount = Math.abs(amount) < 0.005 ? 0 : amount;
  const code = isSupportedFiatCurrency(currency) ? currency.trim().toUpperCase() : 'NGN';

  const base = locale ? resolveLocale(locale) : getActiveLocale();
  let intlLocale = intlLocales[base];
  // `en-US` has no Naira symbol (it renders "NGN 1,234.56"), so use the
  // regional tag for NGN. Other currencies resolve natively in every locale.
  if (code === 'NGN' && base === 'en') intlLocale = 'en-NG';

  const cacheKey = `${intlLocale}|${code}`;
  let formatter = fiatFormatterCache.get(cacheKey);
  if (!formatter) {
    const zeroDecimal = ZERO_DECIMAL_FIAT.has(code);
    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: code,
      // Cap at the currency's real precision; CLDR supplies the matching minimum,
      // so EUR/USD keep both cents ("€1,120.50") instead of "€1,120.5".
      maximumFractionDigits: zeroDecimal ? 0 : 2,
    };
    // NGN is BettaPay's settlement currency and its amounts are whole-naira
    // approximations — matching `formatCurrency` keeps "₦0" rather than "₦0.00".
    if (code === 'NGN') options.minimumFractionDigits = 0;

    formatter = new Intl.NumberFormat(intlLocale, options);
    fiatFormatterCache.set(cacheKey, formatter);
  }

  return formatter.format(safeAmount);
};

/**
 * Locale-aware fiat approximation (e.g. `≈ $0.00` / `≈ ₦0`) used when a
 * conversion rounds to nothing.
 */
export const formatApproxFiat = (
  amount: number,
  currency: string = 'USDC',
  locale?: string,
) => {
  const base = locale ? resolveLocale(locale) : getActiveLocale();
  if (currency === 'NGN') {
    const ngnLocale = base === 'en' ? 'en-NG' : intlLocales[base];
    return `≈ ${new Intl.NumberFormat(ngnLocale, {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)}`;
  }
  return `≈ ${new Intl.NumberFormat(intlLocales[base], {
    style: 'currency',
    currency: 'USD',
  }).format(amount)}`;
};

export const truncateAddress = (address: string) => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Format a date timestamp in the active (or explicit) locale.
 */
export const formatDate = (
  dateString: string | Date | number,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
) => {
  const date = typeof dateString === 'object' ? dateString : new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  return new Intl.DateTimeFormat(toIntlLocale(locale), options ?? defaultOptions).format(date);
};

export interface FormatRelativeTimeOptions {
  now?: number | Date;
  locale?: string;
  style?: 'long' | 'short' | 'narrow';
  numeric?: 'always' | 'auto';
}

/**
 * Localize relative time (e.g. "2 hours ago", "il y a 2 heures", "há 2 horas")
 * using Intl.RelativeTimeFormat with the active or specified locale.
 */
export const formatRelativeTime = (
  dateInput: string | Date | number,
  optionsOrNow?: number | Date | FormatRelativeTimeOptions,
  explicitLocale?: string,
): string => {
  let opts: FormatRelativeTimeOptions = {};
  if (typeof optionsOrNow === 'number' || optionsOrNow instanceof Date) {
    opts = { now: optionsOrNow, locale: explicitLocale };
  } else if (optionsOrNow) {
    opts = optionsOrNow;
  }

  const date = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const nowMs = opts.now
    ? typeof opts.now === 'number'
      ? opts.now
      : opts.now.getTime()
    : Date.now();

  const diffMs = date.getTime() - nowMs;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const targetLocale = toIntlLocale(opts.locale ?? explicitLocale);
  const rtf = new Intl.RelativeTimeFormat(targetLocale, {
    numeric: opts.numeric ?? 'auto',
    style: opts.style ?? 'long',
  });

  if (Math.abs(diffSec) < 45) {
    return rtf.format(diffSec, 'second');
  }
  if (Math.abs(diffMin) < 45) {
    return rtf.format(diffMin, 'minute');
  }
  if (Math.abs(diffHour) < 22) {
    return rtf.format(diffHour, 'hour');
  }
  if (Math.abs(diffDay) < 26) {
    return rtf.format(diffDay, 'day');
  }
  if (Math.abs(diffMonth) < 11) {
    return rtf.format(diffMonth, 'month');
  }
  return rtf.format(diffYear, 'year');
};

/** Format an arbitrary number in the active locale (or an explicit override). */
export const formatNumber = (
  value: number,
  locale?: string,
  options?: Intl.NumberFormatOptions,
) => new Intl.NumberFormat(toIntlLocale(locale), options).format(value);
