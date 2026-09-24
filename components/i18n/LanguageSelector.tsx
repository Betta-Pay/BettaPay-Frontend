"use client";

import { Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, usePathname } from "next/navigation";

import { isSupportedLocale, localeStorageKey, supportedLocales } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/locales";

/** Strip a supported locale prefix from a pathname (if present). */
function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/");
  const candidate = segments[1];
  if (candidate && supportedLocales.includes(candidate as Locale)) {
    return "/" + segments.slice(2).join("/");
  }
  return pathname;
}

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [currentLocale, setCurrentLocale] = useState("en");

  // Determine the current locale on mount in the browser only
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(localeStorageKey);
      if (saved && isSupportedLocale(saved)) {
        setCurrentLocale(saved);
      } else if (isSupportedLocale(i18n.resolvedLanguage)) {
        setCurrentLocale(i18n.resolvedLanguage);
      }
    } catch {
      // localStorage access may fail in private mode; fall back to i18n state
    }
    setMounted(true);
  }, [i18n.resolvedLanguage]);

  const changeLanguage = (locale: string) => {
    if (!isSupportedLocale(locale)) return;
    try {
      window.localStorage.setItem(localeStorageKey, locale);
      document.documentElement.lang = locale;
    } catch {
      // localStorage access may fail in private mode; still change language in memory
    }
    setCurrentLocale(locale);
    void i18n.changeLanguage(locale);

    // Navigate to the locale-prefixed URL so the path always reflects the
    // active language (important for SEO and bookmarkability).
    const basePath = stripLocalePrefix(pathname);
    const newPath = `/${locale}${basePath === "/" ? "" : basePath}`;
    router.push(newPath);
  };

  // Prevent hydration mismatch: don't render until mounted in browser
  if (!mounted) {
    return (
      <label className="relative flex items-center text-muted-foreground">
        <span className="sr-only">{t("common.language")}</span>
        <Languages className="pointer-events-none absolute left-2 h-4 w-4" aria-hidden="true" />
        <select
          disabled
          className="h-9 rounded-lg border border-border bg-background pl-8 pr-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
          aria-label={t("common.language")}
        >
          <option>Loading...</option>
        </select>
      </label>
    );
  }

  return (
    <label className="relative flex items-center text-muted-foreground">
      <span className="sr-only">{t("common.language")}</span>
      <Languages className="pointer-events-none absolute left-2 h-4 w-4" aria-hidden="true" />
      <select
        value={currentLocale}
        onChange={(event) => changeLanguage(event.target.value)}
        className="h-9 rounded-lg border border-border bg-background pl-8 pr-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
        aria-label={t("common.language")}
      >
        {supportedLocales.map((locale) => <option key={locale} value={locale}>{t(`languages.${locale}`)}</option>)}
      </select>
    </label>
  );
}
