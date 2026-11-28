/**
 * components/layout/__tests__/ThemePreferenceSync.test.tsx
 *
 * Issue #1148 — the theme restore must wait for the auth store to rehydrate so
 * a reload in dark mode neither flashes light nor clobbers the saved theme.
 */

import React from "react";
import { render } from "@testing-library/react";

// State lives inside the factories (accessed later via `requireMock`) so the
// jest.mock factories never reference hoisted out-of-scope variables.
jest.mock("next-themes", () => {
  const setTheme = jest.fn();
  return {
    useTheme: () => ({ theme: undefined, resolvedTheme: undefined, setTheme }),
    __setTheme: setTheme,
  };
});

jest.mock("@/lib/store/authStore", () => {
  const state: { user: { id: string } | null; _hasHydrated: boolean } = {
    user: null,
    _hasHydrated: false,
  };
  return {
    useAuthStore: (selector: (s: typeof state) => unknown) => selector(state),
    __authState: state,
  };
});

import { ThemePreferenceSync } from "@/components/layout/ThemePreferenceSync";
import { getThemeStorageKey } from "@/lib/hooks/useThemePreference";

const { __setTheme: setTheme } = jest.requireMock("next-themes") as {
  __setTheme: jest.Mock;
};
const { __authState: authState } = jest.requireMock("@/lib/store/authStore") as {
  __authState: { user: { id: string } | null; _hasHydrated: boolean };
};

const GUEST_KEY = getThemeStorageKey(null);
const USER_KEY = getThemeStorageKey("u1");

describe("ThemePreferenceSync (#1148)", () => {
  beforeEach(() => {
    setTheme.mockClear();
    window.localStorage.clear();
    authState.user = null;
    authState._hasHydrated = false;
  });

  it("applies no theme before the auth store has rehydrated", () => {
    window.localStorage.setItem(GUEST_KEY, "light");
    window.localStorage.setItem(USER_KEY, "dark");
    authState.user = { id: "u1" };
    authState._hasHydrated = false;

    render(<ThemePreferenceSync />);

    expect(setTheme).not.toHaveBeenCalled();
  });

  it("applies the user-scoped theme once rehydration completes", () => {
    window.localStorage.setItem(USER_KEY, "dark");
    authState.user = { id: "u1" };
    authState._hasHydrated = true;

    render(<ThemePreferenceSync />);

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("never falls back to a stale guest theme while a user is signed in", () => {
    window.localStorage.setItem(GUEST_KEY, "light");
    window.localStorage.setItem(USER_KEY, "dark");
    authState.user = { id: "u1" };
    authState._hasHydrated = true;

    render(<ThemePreferenceSync />);

    expect(setTheme).not.toHaveBeenCalledWith("light");
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("applies the theme once rehydration flips to true", () => {
    window.localStorage.setItem(USER_KEY, "dark");
    authState.user = { id: "u1" };
    authState._hasHydrated = false;

    const { rerender } = render(<ThemePreferenceSync />);
    expect(setTheme).not.toHaveBeenCalled();

    authState._hasHydrated = true;
    rerender(<ThemePreferenceSync />);

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("still migrates a guest preference to the user on a real login", () => {
    window.localStorage.setItem(GUEST_KEY, "dark");
    authState.user = null;
    authState._hasHydrated = true;

    const { rerender } = render(<ThemePreferenceSync />);
    setTheme.mockClear(); // ignore the guest restore

    // Genuine login: userId null -> "u2".
    authState.user = { id: "u2" };
    rerender(<ThemePreferenceSync />);

    expect(window.localStorage.getItem(getThemeStorageKey("u2"))).toBe("dark");
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
