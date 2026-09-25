import { getLocaleDirection } from "@/lib/i18n/locales";

describe("getLocaleDirection", () => {
  it("returns ltr for supported LTR locales", () => {
    expect(getLocaleDirection("en")).toBe("ltr");
    expect(getLocaleDirection("fr")).toBe("ltr");
    expect(getLocaleDirection("pt-BR")).toBe("ltr");
    expect(getLocaleDirection("sw-KE")).toBe("ltr");
  });

  it("returns rtl for RTL languages by base code", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("ar-EG")).toBe("rtl");
    expect(getLocaleDirection("he")).toBe("rtl");
    expect(getLocaleDirection("he-IL")).toBe("rtl");
  });

  it("falls back to ltr for unknown, case-insensitively", () => {
    expect(getLocaleDirection("FR")).toBe("ltr");
    expect(getLocaleDirection("de")).toBe("ltr");
    expect(getLocaleDirection("")).toBe("ltr");
    expect(getLocaleDirection(null)).toBe("ltr");
    expect(getLocaleDirection(undefined)).toBe("ltr");
  });
});