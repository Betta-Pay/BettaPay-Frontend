"use client";

import { useTranslation } from "react-i18next";

import en from "./en.json";

function englishFallback(key: string): string {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, en);
  return typeof value === "string" ? value : key;
}

export function useAppTranslation() {
  const translation = useTranslation();
  return {
    ...translation,
    t: translation.i18n.isInitialized ? translation.t : englishFallback,
  };
}
