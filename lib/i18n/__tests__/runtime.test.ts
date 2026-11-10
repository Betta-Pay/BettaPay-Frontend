import i18n from "../config";
import {
  hasTranslationKey,
  resetMissingKeyWarnings,
  setActiveI18nInstance,
  translate,
} from "../runtime";

describe("lib/i18n/runtime — missing translation key warning (#921)", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    setActiveI18nInstance(i18n);
    await i18n.changeLanguage("en");
    resetMissingKeyWarnings();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalNodeEnv,
      configurable: true,
      writable: true,
    });
    await i18n.changeLanguage("en");
    warnSpy.mockRestore();
  });

  it("checks whether a key exists in the active locale dictionary", () => {
    expect(hasTranslationKey("zod.errors.invalidFormat.email", "en")).toBe(true);
    expect(hasTranslationKey("nonexistent.feature.key", "en")).toBe(false);
  });

  it("emits a formatted console.warn in development mode when translating a missing key", async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
      writable: true,
    });
    await i18n.changeLanguage("fr");

    const rendered = translate("missing.checkout.banner.title");
    expect(rendered).toBe("missing.checkout.banner.title");
    expect(warnSpy).toHaveBeenCalledWith(
      '[i18n] Missing translation key "missing.checkout.banner.title" for locale "fr"',
    );
  });

  it("suppresses console warnings in production while falling back gracefully to the key name", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
      writable: true,
    });

    const rendered = translate("missing.production.key");
    expect(rendered).toBe("missing.production.key");
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
