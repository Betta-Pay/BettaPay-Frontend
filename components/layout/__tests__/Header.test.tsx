import React from "react";
import { renderToString } from "react-dom/server";
import { render, screen, fireEvent } from "@testing-library/react";
import Header from "../Header";
import { HeaderAuthProvider } from "../HeaderAuthContext";

const validToken = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.c2lnbmF0dXJl`;

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
    cookieJar.set("auth_token", validToken);
    cookieJar.set("user_role", "merchant");
    const html = ssr();
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("navigation.dashboard");
    expect(html).not.toContain("/auth/login");
    expect(html).not.toContain("/auth/register");
  });

  it("sends admins to /overview", () => {
    cookieJar.set("auth_token", validToken);
    cookieJar.set("user_role", "admin");
    expect(ssr()).toContain('href="/overview"');
  });

  it("treats an empty auth_token as logged out", () => {
    cookieJar.set("auth_token", "   ");
    expect(ssr()).toContain('href="/auth/login"');
  });

  it("server-renders the dashboard link on /payment-links (auth-only route using the public Header)", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PaymentLinksLayout = require("@/app/payment-links/layout").default as typeof MarketingLayout;
    cookieJar.set("auth_token", validToken);
    const html = renderToString(PaymentLinksLayout({ children: <Header /> }));
    expect(html).toContain('href="/dashboard"');
    expect(html).not.toContain("/auth/login");
  });

  it("falls back to logged-out links outside a server auth layout", () => {
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

  it("links to /#features from the marketing navigation (issue #1130)", () => {
    const html = ssr();
    expect(html).toContain('href="/#features"');
  });

  it("toggles mobile navigation drawer with hamburger button and Escape key (issue #1130)", () => {
    render(<Header />);
    const menuButton = screen.getByRole("button", { name: /toggle navigation menu/i });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();

    // Open drawer
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    const mobileNav = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(mobileNav).toBeInTheDocument();

    // Features link in mobile drawer
    const featuresLink = screen.getAllByRole("link", { name: "navigation.features" });
    expect(featuresLink.length).toBeGreaterThanOrEqual(1);
    expect(featuresLink[0]).toHaveAttribute("href", "/#features");

    // Close with Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
  });
});
