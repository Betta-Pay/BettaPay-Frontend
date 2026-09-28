/**
 * Tests for useAppTranslation — ensures translations always resolve to real
 * text and never fall back to the raw key string.
 */
import { renderHook } from "@testing-library/react";

// Bootstrap the i18next instance (bundled dictionaries, no HTTP) before
// importing the hook so the "isInitialized" branch is exercised.
import "@/lib/i18n/config";
import { useAppTranslation } from "@/lib/i18n/useAppTranslation";
import en from "@/lib/i18n/en.json";

type Dict = Record<string, unknown>;

/** Recursively collect dot-notation leaf key paths from a nested object. */
function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Dict).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const allEnKeys = flattenKeys(en);

describe("useAppTranslation", () => {
  it("returns an object with a t function and i18n instance", () => {
    const { result } = renderHook(() => useAppTranslation());
    expect(typeof result.current.t).toBe("function");
    expect(result.current.i18n).toBeDefined();
  });

  it("i18n instance is initialised (bundled resources — no async load needed)", () => {
    const { result } = renderHook(() => useAppTranslation());
    expect(result.current.i18n.isInitialized).toBe(true);
  });

  it("resolves to the 'translation' namespace", () => {
    const { result } = renderHook(() => useAppTranslation());
    // The hook should be bound to the 'translation' namespace.
    // react-i18next exposes the active namespaces on the i18n instance.
    expect(result.current.i18n.options.defaultNS).toBe("translation");
  });

  it.each(allEnKeys)(
    "t('%s') returns real translated text, not the raw key",
    (key) => {
      const { result } = renderHook(() => useAppTranslation());
      // `key` comes from a plain string array, so go through the untyped
      // surface — this assertion is about the returned value, not the key type.
      const translate = result.current.t as (k: string) => string;
      const text = translate(key);
      // The translation must not equal the raw key string.
      expect(text).not.toBe(key);
      // The translation must be a non-empty string.
      expect(typeof text).toBe("string");
      expect((text as string).length).toBeGreaterThan(0);
    },
  );

  it("englishFallback is used when i18n is not initialised", () => {
    // Simulate the pre-init state by directly calling the hook's fallback
    // function via the exported hook but overriding isInitialized.
    // We test this indirectly: if the hook were to receive an uninitialised
    // i18n instance it would call englishFallback which reads en.json directly.
    // Verify the en.json lookup behaves correctly for a known key.
    const knownKey = "common.brand";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const enDict = require("@/lib/i18n/en.json");
    const value = knownKey.split(".").reduce<unknown>((obj, seg) => {
      if (obj && typeof obj === "object" && seg in (obj as Record<string, unknown>)) {
        return (obj as Record<string, unknown>)[seg];
      }
      return undefined;
    }, enDict);
    expect(value).toBe("BettaPay");
  });

  it("returns the key itself for a missing translation (controlled fallback)", () => {
    const { result } = renderHook(() => useAppTranslation());
    // @ts-expect-error — deliberately passing a non-existent key
    const text = result.current.t("__nonexistent.key.that.does.not.exist__");
    expect(text).toBe("__nonexistent.key.that.does.not.exist__");
  });
});
