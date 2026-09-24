import React from "react";
import { renderToString } from "react-dom/server";
import Header from "../Header";
import { HeaderAuthProvider } from "../HeaderAuthContext";

jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: React.PropsWithChildren<{ href?: string }>) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/i18n/LanguageSelector", () => ({
  LanguageSelector: () => null,
}));

jest.mock("@/lib/i18n/useAppTranslation", () => ({
  useAppTranslation: () => ({ t: (key: string) => key }),
}));

const cookieJar = new Map<string, string>();
jest.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined),
  }),
}));

// Import after the next/headers mock is registered.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MarketingLayout = require("@/app/(marketing)/layout").default as (props: {
  children: React.ReactNode;
}) => React.ReactElement;

/**
 * Server-render the Header exactly as the marketing layout does. Asserting on
 * the SSR string (not the hydrated DOM) is what proves there is no flash of
 * logged-out links: this is the first HTML the browser paints (issue #712).
 */
function ssr() {
  return renderToString(MarketingLayout({ children: <Header /> }));
}

describe("Header auth state (issue #712)", () => {
  beforeEach(() => cookieJar.clear());

  it("server-renders login / get started for anonymous visitors", () => {
    const html = ssr();
    expect(html).toContain('href="/auth/login"');
    expect(html).toContain('href="/auth/register"');
    expect(html).not.toContain("navigation.dashboard");
  });

  it("server-renders the dashboard link for a signed-in merchant, with no logged-out links", () => {
    cookieJar.set("auth_token", "tok");
    cookieJar.set("user_role", "merchant");
    const html = ssr();
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("navigation.dashboard");
    expect(html).not.toContain("/auth/login");
    expect(html).not.toContain("/auth/register");
  });

  it("sends admins to /overview", () => {
    cookieJar.set("auth_token", "tok");
    cookieJar.set("user_role", "admin");
    expect(ssr()).toContain('href="/overview"');
  });

  it("treats an empty auth_token as logged out", () => {
    cookieJar.set("auth_token", "   ");
    expect(ssr()).toContain('href="/auth/login"');
  });

  it("falls back to logged-out links outside the marketing layout", () => {
    const html = renderToString(<Header />);
    expect(html).toContain('href="/auth/login"');
  });

  it("honours an explicit provider value", () => {
    const html = renderToString(
      <HeaderAuthProvider value={{ isAuthenticated: true, role: "merchant" }}>
        <Header />
      </HeaderAuthProvider>,
    );
    expect(html).toContain('href="/dashboard"');
  });
});
