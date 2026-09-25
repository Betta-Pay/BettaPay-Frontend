import React from "react";
import { renderToString } from "react-dom/server";
import NotFound from "../not-found";

const mockCookieJar = new Map<string, string>();

jest.mock("@/components/ui/button", () => jest.requireActual("@/components/ui/button"));

jest.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => {
      const value = mockCookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    className,
  }: React.PropsWithChildren<{ href: string; className?: string }>) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: () => <span data-testid="brand-logo" />,
}));

function renderNotFound() {
  return renderToString(<NotFound />);
}

describe("Not found recovery journey (issue #735)", () => {
  beforeEach(() => {
    mockCookieJar.clear();
  });

  it("offers a branded route home for anonymous visitors", () => {
    const html = renderNotFound();

    expect(html).toContain("BettaPay");
    expect(html).toContain('href="/"');
    expect(html).toContain("Return to Home");
    expect(html).toContain('href="/contact"');
    expect(html).not.toContain("Return to Dashboard");
  });

  it("returns merchants to their dashboard", () => {
    mockCookieJar.set("auth_token", "merchant-token");
    mockCookieJar.set("user_role", "merchant");

    const html = renderNotFound();

    expect(html).toContain("BettaPay");
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("Return to Dashboard");
    expect(html).toContain('href="/contact"');
  });

  it("returns administrators to the overview", () => {
    mockCookieJar.set("auth_token", "admin-token");
    mockCookieJar.set("user_role", "admin");

    const html = renderNotFound();

    expect(html).toContain("BettaPay");
    expect(html).toContain('href="/overview"');
    expect(html).toContain("Return to Dashboard");
  });

  it("treats an empty authentication token as anonymous", () => {
    mockCookieJar.set("auth_token", "   ");
    mockCookieJar.set("user_role", "admin");

    const html = renderNotFound();

    expect(html).toContain('href="/"');
    expect(html).toContain("Return to Home");
    expect(html).not.toContain('href="/overview"');
  });
});
