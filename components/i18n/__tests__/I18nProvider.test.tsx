import { render, screen, waitFor } from "@testing-library/react";
import { useTranslation } from "react-i18next";

import { I18nProvider } from "../I18nProvider";
import { localeStorageKey } from "@/lib/i18n/config";

function Probe() {
  const { i18n } = useTranslation();
  return <span data-testid="resolved-locale">{i18n.resolvedLanguage}</span>;
}

function mockNavigatorLanguages(languages: string[]) {
  Object.defineProperty(window.navigator, "languages", { value: languages, configurable: true });
  Object.defineProperty(window.navigator, "language", { value: languages[0], configurable: true });
}

describe("I18nProvider — browser language detection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("detects a supported browser language and switches to it after mount", async () => {
    mockNavigatorLanguages(["fr-FR", "en-US"]);

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("resolved-locale")).toHaveTextContent("fr"));
    expect(document.documentElement.lang).toBe("fr");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("falls back to English when the browser language is unsupported", async () => {
    mockNavigatorLanguages(["de-DE"]);

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("resolved-locale")).toHaveTextContent("en"));
  });

  it("prefers a previously persisted locale over the browser language", async () => {
    window.localStorage.setItem(localeStorageKey, "pt");
    mockNavigatorLanguages(["fr-FR"]);

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("resolved-locale")).toHaveTextContent("pt"));
  });
});
