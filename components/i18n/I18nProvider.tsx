"use client";

import { ReactNode, useEffect, useState } from "react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";

import { defaultLocale, detectPreferredLocale, resources } from "@/lib/i18n/config";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [i18n] = useState(() => {
    const instance = createInstance();
    void instance.init({
      resources,
      lng: defaultLocale,
      fallbackLng: defaultLocale,
      interpolation: { escapeValue: false },
      initAsync: false,
    });
    return instance;
  });

  useEffect(() => {
    const preferredLocale = detectPreferredLocale();
    void i18n.changeLanguage(preferredLocale);
    document.documentElement.lang = preferredLocale;
  }, [i18n]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
