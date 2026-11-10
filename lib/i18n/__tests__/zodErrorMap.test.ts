/**
 * Tests for the Zod 4 i18n error map (issue #747).
 *
 * Zod's built-in validation messages must follow the active application
 * language, resolved through the shared i18next instance rather than the
 * hardcoded English defaults.
 */
import { z } from "zod";

import i18n from "@/lib/i18n/config";
// Importing the map installs Zod's global customError hook.
import "@/lib/i18n/zod";

describe("zod error map i18n", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("resolves format errors in the default (English) language", () => {
    const result = z.string().email().safeParse("nope");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Invalid email address");
    }
  });

  it("resolves format errors in French", async () => {
    await i18n.changeLanguage("fr");
    const result = z.string().email().safeParse("nope");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Adresse e-mail invalide");
    }
  });

  it("resolves interpolated size errors in Portuguese", async () => {
    await i18n.changeLanguage("pt");
    const result = z.string().min(5).safeParse("ab");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Deve ter pelo menos 5 caracteres");
    }
  });

  it("resolves enum value errors in Swahili", async () => {
    await i18n.changeLanguage("sw");
    const result = z.enum(["a", "b"]).safeParse("c");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Thamani batili: ilitarajiwa mojawapo ya a, b",
      );
    }
  });

  it("resolves type errors in French", async () => {
    await i18n.changeLanguage("fr");
    const result = z.string().safeParse(12);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Entrée invalide");
    }
  });

  it("resolves required (undefined) and max-length rules reactively when language changes (#923)", async () => {
    const schema = z.object({
      email: z.string().email(),
      code: z.string().max(4),
    });

    await i18n.changeLanguage("fr");
    const frMissing = schema.safeParse({ email: undefined, code: "123456" });
    expect(frMissing.success).toBe(false);
    if (!frMissing.success) {
      const messages = frMissing.error.issues.map((i) => i.message);
      expect(messages[0]).toContain("Entrée invalide");
      expect(messages[1]).toBe("Doit contenir au plus 4 caractères");
    }

    await i18n.changeLanguage("en");
    const enMissing = schema.safeParse({ email: undefined, code: "123456" });
    expect(enMissing.success).toBe(false);
    if (!enMissing.success) {
      const messages = enMissing.error.issues.map((i) => i.message);
      expect(messages[0]).toContain("Invalid input");
      expect(messages[1]).toBe("Too big: expected at most 4 characters");
    }
  });
});
