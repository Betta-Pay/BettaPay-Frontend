import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn(), resolvedTheme: "light" }),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

let mockAuthState = {
  user: { name: "Merchant Acme", role: "merchant" } as Record<string, unknown> | null,
  role: "merchant" as string | null,
  logout: jest.fn(),
};

jest.mock("@/lib/store/authStore", () => ({
  useAuthStore: () => mockAuthState,
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

import { Topbar } from "../Topbar";

describe("Topbar Create Link CTA role gating (issue #1131)", () => {
  it("shows 'Create Link' button for merchant users", () => {
    mockAuthState = {
      user: { name: "Merchant Acme", role: "merchant" },
      role: "merchant",
      logout: jest.fn(),
    };

    render(<Topbar title="Dashboard" />);
    expect(screen.getByRole("button", { name: /create payment link/i })).toBeInTheDocument();
  });

  it("hides 'Create Link' button for admin users", () => {
    mockAuthState = {
      user: { name: "Admin System", role: "admin" },
      role: "admin",
      logout: jest.fn(),
    };

    render(<Topbar title="Platform Operations" />);
    expect(screen.queryByRole("button", { name: /create payment link/i })).not.toBeInTheDocument();
  });
});
