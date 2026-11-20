import { extractLocaleFromPathname, stripLocalePrefix } from "../locales";

describe("extractLocaleFromPathname", () => {
  it("extracts supported locale and returns stripped pathname", () => {
    expect(extractLocaleFromPathname("/en/pay/abc")).toEqual({
      locale: "en",
      stripped: "/pay/abc",
    });
    expect(extractLocaleFromPathname("/fr/auth/login")).toEqual({
      locale: "fr",
      stripped: "/auth/login",
    });
    expect(extractLocaleFromPathname("/pt/about")).toEqual({
      locale: "pt",
      stripped: "/about",
    });
    expect(extractLocaleFromPathname("/sw/dashboard/settings")).toEqual({
      locale: "sw",
      stripped: "/dashboard/settings",
    });
  });

  it("handles bare locale paths and trailing slashes", () => {
    expect(extractLocaleFromPathname("/en")).toEqual({
      locale: "en",
      stripped: "/",
    });
    expect(extractLocaleFromPathname("/fr/")).toEqual({
      locale: "fr",
      stripped: "/",
    });
  });

  it("returns null for paths without a supported locale prefix", () => {
    expect(extractLocaleFromPathname("/pay/abc")).toBeNull();
    expect(extractLocaleFromPathname("/auth/login")).toBeNull();
    expect(extractLocaleFromPathname("/about")).toBeNull();
    expect(extractLocaleFromPathname("/")).toBeNull();
  });

  it("returns null for unsupported locales or malformed paths", () => {
    expect(extractLocaleFromPathname("/de/pay/abc")).toBeNull();
    expect(extractLocaleFromPathname("/es/dashboard")).toBeNull();
    expect(extractLocaleFromPathname("")).toBeNull();
    expect(extractLocaleFromPathname("en/pay/abc")).toBeNull();
  });

  it("stripLocalePrefix returns expected stripped path or original", () => {
    expect(stripLocalePrefix("/en/pay/abc")).toBe("/pay/abc");
    expect(stripLocalePrefix("/fr/auth/login")).toBe("/auth/login");
    expect(stripLocalePrefix("/en")).toBe("/");
    expect(stripLocalePrefix("/pay/abc")).toBe("/pay/abc");
    expect(stripLocalePrefix("/")).toBe("/");
  });
});
