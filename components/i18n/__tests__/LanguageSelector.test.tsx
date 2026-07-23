import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { I18nProvider } from "../I18nProvider";
import { LanguageSelector } from "../LanguageSelector";
import { localeStorageKey } from "@/lib/i18n/config";

describe("LanguageSelector", () => {
  beforeEach(() => window.localStorage.clear());

  it("switches language and persists the preference", async () => {
    render(<I18nProvider><LanguageSelector /></I18nProvider>);
    const selector = await screen.findByRole("combobox", { name: "Language" });

    fireEvent.change(selector, { target: { value: "fr" } });

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Langue" })).toHaveValue("fr"));
    expect(window.localStorage.getItem(localeStorageKey)).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
  });
});
