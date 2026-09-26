/**
 * __tests__/TopbarUserMenuUrlState.test.tsx
 *
 * Guards issue #759: the primary (user) dropdown mirrors its open state into
 * the URL, so a refresh or a shared link keeps it open.
 */
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

import { Topbar } from "@/components/layout/Topbar";

beforeEach(() => {
  window.history.replaceState({}, "", "/dashboard");
});

// `Topbar` lazily loads `NotificationCenter` through `next/dynamic`; rendering
// inside `act` lets that promise settle before assertions run.
async function renderTopbar() {
  await act(async () => {
    render(<Topbar title="Dashboard" />);
  });
}

describe("Topbar user menu URL state (issue #759)", () => {
  it("stays closed when the URL has no menu param", async () => {
    await renderTopbar();

    expect(screen.queryByText("Profile Settings")).not.toBeInTheDocument();
  });

  it("opens from ?menu=open and keeps the param in sync", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/dashboard?menu=open");

    await renderTopbar();

    // Deep link / refresh keeps the menu open.
    expect(await screen.findByText("Profile Settings")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("adds ?menu=open when the user opens the menu", async () => {
    const user = userEvent.setup();
    await renderTopbar();

    await user.click(screen.getByRole("button", { name: "User menu" }));

    expect(await screen.findByText("Profile Settings")).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe("?menu=open"));
  });
});
