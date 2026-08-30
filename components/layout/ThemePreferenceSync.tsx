"use client";

import { useThemePreference } from "@/lib/hooks/useThemePreference";

/**
 * ThemePreferenceSync — zero-render side-effect component.
 * Mount once in the authenticated app shell to activate per-user
 * theme persistence and live OS colour-scheme tracking (issue #460).
 */
export function ThemePreferenceSync() {
  useThemePreference();
  return null;
}
