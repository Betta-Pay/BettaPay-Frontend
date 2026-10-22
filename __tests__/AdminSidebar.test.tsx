/**
 * __tests__/AdminSidebar.test.tsx
 *
 * Verifies:
 *  - All required navigation items render
 *  - Active-route highlighting matches the exact pattern in MerchantSidebar
 *  - Admin branding ("BettaPay Admin Console") is displayed
 *  - Navigation links point to the correct admin routes
 *  - Accessibility requirements (aria-label, aria-current, semantic nav)
 *  - MerchantSidebar behavior is unaffected by the admin implementation
 */

import React from "react";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// next/link — render as a plain anchor so href is testable
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// next/navigation — let each test control the pathname
const mockUsePathname = jest.fn<string, []>();
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// lucide-react — lightweight stubs so tests don't depend on SVG internals
jest.mock("lucide-react", () => {
  const icon = (name: string) => {
    const I = ({ className }: { className?: string }) => (
      <svg data-testid={`icon-${name}`} className={className} />
    );
    I.displayName = name;
    return I;
  };
  return {
    BarChart3: icon("BarChart3"),
    Users: icon("Users"),
    ListOrdered: icon("ListOrdered"),
    Anchor: icon("Anchor"),
    RefreshCcw: icon("RefreshCcw"),
    ShieldAlert: icon("ShieldAlert"),
    Settings: icon("Settings"),
    ScrollText: icon("ScrollText"),
    PackageCheck: icon("PackageCheck"),
    Fingerprint: icon("Fingerprint"),
    ShieldCheck: icon("ShieldCheck"),
    ChevronLeft: icon("ChevronLeft"),
    ChevronRight: icon("ChevronRight"),
    Menu: icon("Menu"),
    X: icon("X"),
    // MerchantSidebar icons
    LayoutDashboard: icon("LayoutDashboard"),
    Link: icon("Link"),
    Wallet: icon("Wallet"),
    Code2: icon("Code2"),
    Building2: icon("Building2"),
  };
});

// @/lib/utils — cn() just joins truthy strings
jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// ---------------------------------------------------------------------------
// Component imports (after mocks)
// ---------------------------------------------------------------------------

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { MerchantSidebar } from "@/components/layout/MerchantSidebar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderAdmin = (pathname = "/overview") => {
  mockUsePathname.mockReturnValue(pathname);
  return render(<AdminSidebar />);
};

const renderMerchant = (pathname = "/dashboard") => {
  mockUsePathname.mockReturnValue(pathname);
  return render(<MerchantSidebar />);
};

// ---------------------------------------------------------------------------
// Expected navigation items for AdminSidebar
// ---------------------------------------------------------------------------

const ADMIN_NAV = [
  { label: "Overview", href: "/overview" },
  { label: "Merchants", href: "/merchants" },
  { label: "Transactions", href: "/admin/transactions" },
  { label: "Anchors", href: "/anchors" },
  { label: "FX Management", href: "/fx-management" },
  { label: "Compliance", href: "/compliance" },
  { label: "Audit Log", href: "/audit" },
  { label: "Batches", href: "/batches" },
  { label: "IP Scores", href: "/security/ip-scores" },
  { label: "Settings", href: "/admin/settings" },
] as const;

// ---------------------------------------------------------------------------
// Tests: AdminSidebar — Render
// ---------------------------------------------------------------------------

describe("AdminSidebar — rendering", () => {
  it("renders all required navigation items", () => {
    renderAdmin();
    const nav = screen.getByRole("navigation", { name: /admin menu/i });
    ADMIN_NAV.forEach(({ label }) => {
      const link = Array.from(nav.querySelectorAll("a")).find((a) =>
        a.textContent?.trim().toLowerCase().includes(label.toLowerCase())
      );
      expect(link).toBeInTheDocument();
    });
  });

  it("renders navigation links with correct hrefs", () => {
    renderAdmin();
    const nav = screen.getByRole("navigation", { name: /admin menu/i });
    ADMIN_NAV.forEach(({ label, href }) => {
      const link = Array.from(nav.querySelectorAll("a")).find((a) =>
        a.textContent?.trim().toLowerCase().includes(label.toLowerCase())
      );
      expect(link).toHaveAttribute("href", href);
    });
  });

  it("renders the correct number of nav items (10)", () => {
    renderAdmin();
    // The logo link is also a <Link>, so we scope to the <nav> element
    const nav = screen.getByRole("navigation", { name: /admin menu/i });
    const links = nav.querySelectorAll("a");
    expect(links).toHaveLength(ADMIN_NAV.length);
  });
});

// ---------------------------------------------------------------------------
// Tests: AdminSidebar — Branding
// ---------------------------------------------------------------------------

describe("AdminSidebar — admin branding", () => {
  it('displays "BettaPay" in the header', () => {
    renderAdmin();
    expect(screen.getByText(/bettapay/i)).toBeInTheDocument();
  });

  it('displays the "Admin Console" badge', () => {
    renderAdmin();
    expect(screen.getByText(/admin console/i)).toBeInTheDocument();
  });

  it("logo link points to /overview", () => {
    renderAdmin();
    const logoLink = screen.getByRole("link", { name: /bettapay admin/i });
    expect(logoLink).toHaveAttribute("href", "/overview");
  });

  it('shows "System Admin" in the footer', () => {
    renderAdmin();
    expect(screen.getByText(/system admin/i)).toBeInTheDocument();
  });

  it('shows "Superuser" role in the footer', () => {
    renderAdmin();
    expect(screen.getByText(/superuser/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests: AdminSidebar — Accessibility
// ---------------------------------------------------------------------------

describe("AdminSidebar — accessibility", () => {
  it("renders a semantic <aside> element", () => {
    const { container } = renderAdmin();
    expect(container.querySelector("aside")).toBeInTheDocument();
  });

  it('<aside> has aria-label="Admin navigation"', () => {
    renderAdmin();
    expect(
      screen.getByRole("complementary", { name: /admin navigation/i })
    ).toBeInTheDocument();
  });

  it('<nav> has aria-label="Admin menu"', () => {
    renderAdmin();
    expect(
      screen.getByRole("navigation", { name: /admin menu/i })
    ).toBeInTheDocument();
  });

  it("active link has aria-current=page", () => {
    renderAdmin("/overview");
    const nav = screen.getByRole("navigation", { name: /admin menu/i });
    const overviewLink = Array.from(nav.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/overview"
    );
    expect(overviewLink).toHaveAttribute("aria-current", "page");
  });

  it("inactive links do NOT have aria-current", () => {
    renderAdmin("/overview");
    const nav = screen.getByRole("navigation", { name: /admin menu/i });
    const merchantsLink = Array.from(nav.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/merchants"
    );
    expect(merchantsLink).not.toHaveAttribute("aria-current");
  });
});

// ---------------------------------------------------------------------------
// Tests: AdminSidebar — Active link detection
// ---------------------------------------------------------------------------

describe("AdminSidebar — active route highlighting", () => {
  // Helper: get a nav link by its href within the admin menu nav
  const getNavLink = (href: string) => {
    const nav = screen.getByRole("navigation", { name: /admin menu/i });
    return Array.from(nav.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === href
    ) as HTMLElement | undefined;
  };

  it("marks Overview as active when pathname is exactly /overview", () => {
    renderAdmin("/overview");
    expect(getNavLink("/overview")).toHaveAttribute("aria-current", "page");
  });

  it("marks Merchants as active when pathname is exactly /merchants", () => {
    renderAdmin("/merchants");
    expect(getNavLink("/merchants")).toHaveAttribute("aria-current", "page");
  });

  it("marks Merchants as active for nested route /merchants/123", () => {
    renderAdmin("/merchants/123");
    expect(getNavLink("/merchants")).toHaveAttribute("aria-current", "page");
  });

  it("marks Transactions as active for /admin/transactions", () => {
    renderAdmin("/admin/transactions");
    expect(getNavLink("/admin/transactions")).toHaveAttribute("aria-current", "page");
  });

  it("marks Transactions as active for nested /admin/transactions/abc", () => {
    renderAdmin("/admin/transactions/abc");
    expect(getNavLink("/admin/transactions")).toHaveAttribute("aria-current", "page");
  });

  it("marks FX Management as active for /fx-management", () => {
    renderAdmin("/fx-management");
    expect(getNavLink("/fx-management")).toHaveAttribute("aria-current", "page");
  });

  it("marks Compliance as active for /compliance", () => {
    renderAdmin("/compliance");
    expect(getNavLink("/compliance")).toHaveAttribute("aria-current", "page");
  });

  it("marks Settings as active for /admin/settings", () => {
    renderAdmin("/admin/settings");
    expect(getNavLink("/admin/settings")).toHaveAttribute("aria-current", "page");
  });

  it("only one nav link is active at a time", () => {
    renderAdmin("/merchants");
    const nav = screen.getByRole("navigation", { name: /admin menu/i });
    const activeLinks = nav.querySelectorAll('[aria-current="page"]');
    expect(activeLinks).toHaveLength(1);
  });

  it("no link is active for an unknown admin path", () => {
    renderAdmin("/admin/unknown-page");
    const nav = screen.getByRole("navigation", { name: /admin menu/i });
    const activeLinks = nav.querySelectorAll('[aria-current="page"]');
    expect(activeLinks).toHaveLength(0);
  });

  it("does NOT falsely activate /merchants when path is /admin/transactions", () => {
    renderAdmin("/admin/transactions");
    expect(getNavLink("/merchants")).not.toHaveAttribute("aria-current");
  });
});

// ---------------------------------------------------------------------------
// Tests: MerchantSidebar — regression guard
// ---------------------------------------------------------------------------

describe("MerchantSidebar — not affected by admin changes", () => {
  const MERCHANT_NAV = [
    { label: "Overview", href: "/dashboard" },
    { label: "Payments", href: "/payments" },
    { label: "Transactions", href: "/transactions" },
    { label: "Settlement", href: "/settlement" },
    { label: "Wallet", href: "/wallet" },
    { label: "FX Rates", href: "/fx" },
    { label: "Developers", href: "/developers" },
    { label: "Settings", href: "/settings" },
  ] as const;

  it("renders all merchant navigation items", () => {
    renderMerchant("/dashboard");
    MERCHANT_NAV.forEach(({ label }) => {
      expect(screen.getByRole("link", { name: new RegExp(label, "i") })).toBeInTheDocument();
    });
  });

  it("renders merchant nav links with correct hrefs", () => {
    renderMerchant("/dashboard");
    MERCHANT_NAV.forEach(({ label, href }) => {
      const link = screen.getByRole("link", { name: new RegExp(label, "i") });
      expect(link).toHaveAttribute("href", href);
    });
  });

  it("marks /dashboard active when pathname is /dashboard", () => {
    renderMerchant("/dashboard");
    // MerchantSidebar uses isActive with pathname === or startsWith, but does not
    // set aria-current — we verify the active class is applied instead
    const nav = screen.getByRole("navigation");
    const dashboardLink = Array.from(nav.querySelectorAll("a")).find((a) =>
      a.getAttribute("href") === "/dashboard"
    );
    expect(dashboardLink).toBeDefined();
    expect(dashboardLink!.className).toMatch(/amber/); // active amber styling
  });

  it('still shows "BettaPay" branding (not admin branding)', () => {
    renderMerchant();
    // Confirm there's no "Admin Console" text in merchant sidebar
    expect(screen.queryByText(/admin console/i)).not.toBeInTheDocument();
  });

  it('shows "Merchant Corp" in the footer', () => {
    renderMerchant();
    expect(screen.getByText(/merchant corp/i)).toBeInTheDocument();
  });
});
