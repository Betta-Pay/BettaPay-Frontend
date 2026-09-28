/**
 * __tests__/TopbarLandmark.test.tsx
 *
 * Guards issue #538: the merchant/admin app shell must expose exactly one
 * `banner` landmark. `Header` (marketing pages) is the `<header>` banner;
 * `Topbar` (app pages) must be a labelled `region`, never a second banner.
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn(), resolvedTheme: "light" }),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/lib/store/authStore", () => ({
  useAuthStore: () => ({ user: { name: "Acme", email: "a@b.co" }, logout: jest.fn() }),
}));
jest.mock("@/lib/store/walletStore", () => ({
  useWalletStore: (sel: (s: unknown) => unknown) =>
    sel({ network: "testnet", isConnected: true, setNetwork: jest.fn() }),
}));
jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));
jest.mock("@/components/notifications/NotificationCenter", () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));
jest.mock("@/components/ui/dropdown-menu", () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Trigger = ({ render }: { render?: React.ReactNode }) => <div>{render}</div>;
  return {
    DropdownMenu: Passthrough,
    DropdownMenuContent: Passthrough,
    DropdownMenuGroup: Passthrough,
    DropdownMenuItem: Passthrough,
    DropdownMenuLabel: Passthrough,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuTrigger: Trigger,
  };
});

import { Topbar } from "@/components/layout/Topbar";

describe("Topbar landmark (issue #538)", () => {
  it("is a labelled region, not a second banner", () => {
    render(<Topbar title="Dashboard" />);
    // No banner landmark comes from the Topbar itself.
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    // It exposes a labelled region instead.
    expect(screen.getByRole("region", { name: /top bar/i })).toBeInTheDocument();
  });
});
