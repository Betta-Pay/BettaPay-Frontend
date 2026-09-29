/**
 * __tests__/PaymentLinkInvalidState.test.tsx
 *
 * Verifies the public payment link page (`app/pay/[linkId]/page.tsx`) when the
 * link cannot be resolved (issue #741):
 *  - shows a loading placeholder while the link fetch is in flight
 *  - renders the branded empty state for 404 / expired / transient failures
 *  - never throws or renders the payment form for invalid links
 *  - offers "Try again" only for transient failures
 *
 * The page is heavy (Stellar SDK, wallet store, dynamic wallet modal), so
 * every non-empty-state dependency is stubbed; the empty state itself is
 * asserted through its data-testid rather than its internals (unit-covered in
 * components/payments/__tests__/InvalidPaymentLinkState.test.tsx).
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// ── next/navigation ──────────────────────────────────────────────────────────
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({ linkId: "invalid-id-123" }),
  useSearchParams: () => new URLSearchParams(),
}));

// ── next/dynamic (render the wallet modal as a passthrough) ──────────────────
jest.mock("next/dynamic", () => {
  // Minimal shape-compatible stand-in: resolves to a no-op modal component.
  return (loader: unknown) => {
    void loader;
    return function MockDynamic() {
      return null;
    };
  };
});

// ── framer-motion ────────────────────────────────────────────────────────────
jest.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop) => {
        const MotionDiv = ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) =>
          React.createElement(prop as string, rest, children);
        return MotionDiv;
      },
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Wallet modal plumbing (not under test) ───────────────────────────────────
jest.mock("@/components/wallet/WalletModalFallback", () => ({
  WalletModalFallback: () => null,
}));
jest.mock("@/components/wallet/WalletModalErrorBoundary", () => ({
  WalletModalErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── wallet store ─────────────────────────────────────────────────────────────
const walletState = {
  isConnected: false,
  connect: jest.fn(),
  address: null,
  walletModalOpen: false,
  setWalletModalOpen: jest.fn(),
};
jest.mock("@/lib/store/walletStore", () => ({
  // zustand returns the whole state when called without a selector.
  useWalletStore: (selector?: (state: typeof walletState) => unknown) =>
    selector ? selector(walletState) : walletState,
}));

// ── Stellar SDK (imported by the page; not exercised here) ───────────────────
jest.mock("@stellar/stellar-sdk", () => ({
  Contract: jest.fn(),
  rpc: { Server: jest.fn() },
  TransactionBuilder: jest.fn(),
  nativeToScVal: jest.fn(),
}));
jest.mock("@/lib/stellar/freighter", () => ({
  signWithFreighter: jest.fn(),
}));

// ── API client ───────────────────────────────────────────────────────────────
// jest.mock factories are hoisted above `const` declarations, so the fns are
// created inside the factory and aliased afterwards.
jest.mock("@/lib/api/axios", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));
import { apiClient } from "@/lib/api/axios";
const mockGet = apiClient.get as jest.Mock;

// ── Currency selector (base-ui crashes in jsdom) ─────────────────────────────
jest.mock("@/components/payments/CurrencySelector", () => ({
  CurrencySelector: () => null,
}));

// ── QR modal ─────────────────────────────────────────────────────────────────
jest.mock("@/components/payments/QRCode", () => ({
  QRCodeModal: () => null,
}));

// ── lucide-react icons ───────────────────────────────────────────────────────
jest.mock("lucide-react", () => {
  const icon = (name: string) => {
    const I = ({ className }: { className?: string }) => (
      <svg data-testid={`icon-${name}`} className={className} />
    );
    I.displayName = name;
    return I;
  };
  return {
    ArrowRight: icon("ArrowRight"),
    QrCode: icon("QrCode"),
    CloudOff: icon("CloudOff"),
    TimerOff: icon("TimerOff"),
    Unlink: icon("Unlink"),
    LucideIcon: null,
  };
});

// ── EmptyState (assert the page wires the branded state, not its internals) ──
jest.mock("@/components/shared/EmptyState", () => ({
  EmptyState: ({
    title,
    action,
    secondaryAction,
  }: {
    title: string;
    action?: { label: string; onClick: () => void };
    secondaryAction?: { label: string; onClick: () => void };
  }) => (
    <div>
      {title}
      {action ? <button onClick={action.onClick}>{action.label}</button> : null}
      {secondaryAction ? <button onClick={secondaryAction.onClick}>{secondaryAction.label}</button> : null}
    </div>
  ),
}));

// ── next/image ───────────────────────────────────────────────────────────────
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} data-testid="brand-logo" />,
}));

// ── notify hook ──────────────────────────────────────────────────────────────
jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn(), silent: jest.fn() }),
}));

// ── lib/config (env shape consumed by the page) ──────────────────────────────
jest.mock("@/lib/config", () => ({
  SOROBAN_RPC_URL: "https://soroban.test",
  SETTLEMENT_CONTRACT_ID: "CCONTRACT",
  MERCHANT_ADDRESS: "GMERCHANT",
  STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
}));

// ── next/image config expectations (next/jest handles this; keep UI simple) ──
jest.mock("@/lib/utils/constants", () => ({
  MULTI_CURRENCY_ASSETS: {
    USDC: { code: "USDC", stroopMultiplier: 10_000_000 },
  },
  MOCK_RATES: {},
  USE_MOCK_RATE_DATA: false,
  // StatusBadge (pulled in via the @/components/shared barrel) needs these.
  PAYMENT_STATUS: {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
    EXPIRED: "expired",
  },
  normalizePaymentStatus: (raw: string) => raw,
}));

import PaymentLinkPage from "@/app/pay/[linkId]/page";

function makeAxiosError(status: number, message?: string) {
  const error = new Error(message ?? `Request failed with status code ${status}`);
  Object.assign(error, {
    isAxiosError: true,
    response: { status, data: message ? { message } : {} },
  });
  return error;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PaymentLinkPage — loading state", () => {
  it("shows a loading placeholder while the link is being resolved", async () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never settles
    render(<PaymentLinkPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/loading payment link/i)).toBeInTheDocument();
    expect(screen.queryByTestId("invalid-link-state")).not.toBeInTheDocument();
  });
});

describe("PaymentLinkPage — invalid links (issue #741)", () => {
  it("renders the branded empty state on a 404", async () => {
    mockGet.mockRejectedValue(makeAxiosError(404));
    render(<PaymentLinkPage />);

    await waitFor(() =>
      expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument(),
    );
    expect(screen.getByText(/no longer valid/i)).toBeInTheDocument();
  });

  it("renders the expired copy when the backend reports expiry", async () => {
    mockGet.mockRejectedValue(makeAxiosError(410, "This payment link has expired"));
    render(<PaymentLinkPage />);

    await waitFor(() =>
      expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument(),
    );
    expect(screen.getByText(/has expired/i)).toBeInTheDocument();
  });

  it("renders the expired copy for a 403 with an expiry message", async () => {
    mockGet.mockRejectedValue(makeAxiosError(403, "Link expired on 2026-01-01"));
    render(<PaymentLinkPage />);

    await waitFor(() => expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument());
    expect(screen.getByText(/has expired/i)).toBeInTheDocument();
  });

  it("shows the link id as a support reference", async () => {
    mockGet.mockRejectedValue(makeAxiosError(404));
    render(<PaymentLinkPage />);

    await waitFor(() => expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument());
    expect(screen.getByText("invalid-id-123")).toBeInTheDocument();
  });

  it("does not offer retry for a definitively invalid link", async () => {
    mockGet.mockRejectedValue(makeAxiosError(404));
    render(<PaymentLinkPage />);

    await waitFor(() => expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("offers retry for transient failures and recovers on success", async () => {
    mockGet.mockRejectedValueOnce(makeAxiosError(500));
    render(<PaymentLinkPage />);

    await waitFor(() => expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument());
    expect(screen.getByText(/couldn't load this payment link/i)).toBeInTheDocument();

    mockGet.mockResolvedValueOnce({
      data: {
        id: "invalid-id-123",
        merchantName: "Merchant Corp",
        label: "Consulting Retainer Q3",
        type: "open",
        currency: "USDC",
        fixedAmount: 0,
        isMultiCurrency: false,
        acceptedCurrencies: ["USDC"],
        expiresAt: null,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Merchant Corp" })).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("invalid-link-state")).not.toBeInTheDocument();
  });

  it("never renders the payment form for an invalid link", async () => {
    mockGet.mockRejectedValue(makeAxiosError(404));
    render(<PaymentLinkPage />);

    await waitFor(() => expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("0.00")).not.toBeInTheDocument();
  });
});

describe("PaymentLinkPage — valid link renders the payment form", () => {
  it("renders merchant branding and the amount input once resolved", async () => {
    mockGet.mockResolvedValue({
      data: {
        id: "link_01",
        merchantName: "Merchant Corp",
        label: "Consulting Retainer Q3",
        type: "open",
        currency: "USDC",
        fixedAmount: 0,
        isMultiCurrency: false,
        acceptedCurrencies: ["USDC"],
        expiresAt: null,
      },
    });
    render(<PaymentLinkPage />);

    expect(await screen.findByRole("heading", { name: "Merchant Corp" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
    expect(screen.queryByTestId("invalid-link-state")).not.toBeInTheDocument();
  });
});
