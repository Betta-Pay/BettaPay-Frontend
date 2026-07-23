"use client";

import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { isSupportedLocale, localeStorageKey, supportedLocales } from "@/lib/i18n/config";

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const currentLocale = isSupportedLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";

  const changeLanguage = (locale: string) => {
    if (!isSupportedLocale(locale)) return;
    window.localStorage.setItem(localeStorageKey, locale);
    document.documentElement.lang = locale;
    void i18n.changeLanguage(locale);
  };

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
