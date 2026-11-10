import {
  clearLocaleDictionaryCache,
  getCachedLocaleDictionary,
  loadLocaleDictionary,
} from "../locales";

describe("loadLocaleDictionary — dynamic locale code-splitting & caching (#922)", () => {
  beforeEach(() => {
    clearLocaleDictionaryCache();
  });

  it("pre-caches English by default while leaving non-default locales uncached until requested", () => {
    expect(getCachedLocaleDictionary("en")).toBeDefined();
    expect(getCachedLocaleDictionary("fr")).toBeUndefined();
    expect(getCachedLocaleDictionary("pt")).toBeUndefined();
    expect(getCachedLocaleDictionary("sw")).toBeUndefined();
  });

  it("loads French, Portuguese, and Swahili dictionaries on demand via dynamic import and caches them", async () => {
    const frDict = await loadLocaleDictionary("fr-FR");
    expect(frDict).toBeDefined();
    expect(getCachedLocaleDictionary("fr")).toBe(frDict);

    // Subsequent call returns the exact cached reference
    const frCached = await loadLocaleDictionary("fr");
    expect(frCached).toBe(frDict);

    const ptDict = await loadLocaleDictionary("pt");
    expect(getCachedLocaleDictionary("pt")).toBe(ptDict);

    const swDict = await loadLocaleDictionary("sw");
    expect(getCachedLocaleDictionary("sw")).toBe(swDict);
  });

  it("falls back to the default English dictionary for unsupported locale tags", async () => {
    const fallbackDict = await loadLocaleDictionary("de-DE");
    expect(fallbackDict).toBe(getCachedLocaleDictionary("en"));
  });
});
