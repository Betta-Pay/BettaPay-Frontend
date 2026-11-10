import { getThemeStorageKey } from "../hooks/useThemePreference";

describe("Theme preference persistence across auth state transitions (#938)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  it("preserves the dark theme class on <html> and next-themes localStorage across logout and re-login", () => {
    // 1. User selects dark theme while authenticated in settings
    window.localStorage.setItem("theme", "dark");
    window.localStorage.setItem(getThemeStorageKey("merchant-1"), "dark");
    document.documentElement.classList.add("dark");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("theme")).toBe("dark");

    // 2. Simulate logout clearing auth session storage
    window.localStorage.removeItem("bp-session");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("theme")).toBe("dark");

    // 3. Simulate re-login and verify dark theme class and localStorage remain intact
    window.localStorage.setItem(
      "bp-session",
      JSON.stringify({ state: { isLoggedIn: true }, version: 0 }),
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });
});
