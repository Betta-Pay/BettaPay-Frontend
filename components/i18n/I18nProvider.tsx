"use client";

import { ReactNode, useEffect, useState } from "react";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { defaultLocale, detectPreferredLocale, fallbackResources } from "@/lib/i18n/config";
import { getLocaleDirection, supportedLocales } from "@/lib/i18n/locales";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [i18n] = useState(() => {
    const instance = createInstance();
    void instance
      .use(initReactI18next)
      .init({
        fallbackLng: defaultLocale,
        supportedLngs: [...supportedLocales],
        ns: ["translation"],
        defaultNS: "translation",
        // Dictionaries are bundled directly; no runtime HTTP fetching.
        resources: fallbackResources,
        interpolation: { escapeValue: false },
        initAsync: false,
        react: { useSuspense: false },
      });
    return instance;
  });

  useEffect(() => {
    const preferredLocale = detectPreferredLocale();
    void i18n.changeLanguage(preferredLocale);
    document.documentElement.lang = preferredLocale;
    document.documentElement.dir = getLocaleDirection(preferredLocale);
  }, [i18n]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
