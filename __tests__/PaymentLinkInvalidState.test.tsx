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
 *
 * The same stubs also cover the checkout behaviour added for issue #1125 — the
 * live `/api/rates` quote and the SEP-0007 destination address — so this file
 * is the page-level suite for both.
 */

import React from "react";
import { readFileSync } from "fs";
import path from "path";
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

// The QR canvas is how the SEP-0007 URI becomes visible to a test: the real
// component paints pixels, so it is replaced with one that exposes `value`.
jest.mock("qrcode.react", () => ({
  QRCodeCanvas: ({ value }: { value: string }) => (
    <canvas data-testid="sep0007-qr" data-value={value} />
  ),
}));

// ── lucide-react icons ───────────────────────────────────────────────────────
// The page imports its icons by name (issue #1125), so every name it uses has
// to exist here — a missing one now fails loudly instead of rendering nothing.
jest.mock("lucide-react", () => {
  const icon = (name: string) => {
    const I = ({ className }: { className?: string }) => (
      <svg data-testid={`icon-${name}`} className={className} />
    );
    I.displayName = name;
    return I;
  };
  return {
    // Used by the invalid-link state and the shared chrome.
    ArrowRight: icon("ArrowRight"),
    QrCode: icon("QrCode"),
    CloudOff: icon("CloudOff"),
    TimerOff: icon("TimerOff"),
    Unlink: icon("Unlink"),
    // Used by the checkout page itself.
    AlertTriangle: icon("AlertTriangle"),
    Building: icon("Building"),
    Check: icon("Check"),
    CheckCircle2: icon("CheckCircle2"),
    Clock: icon("Clock"),
    Copy: icon("Copy"),
    CreditCard: icon("CreditCard"),
    ExternalLink: icon("ExternalLink"),
    Info: icon("Info"),
    RefreshCw: icon("RefreshCw"),
    ShieldCheck: icon("ShieldCheck"),
    Smartphone: icon("Smartphone"),
    Wallet: icon("Wallet"),
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
// The page reads the merchant destination address while rendering, so it is
// exposed through a getter the tests can flip between "configured" and
// "missing" (issue #1125).
let mockMerchantAddress = "GMERCHANT";
jest.mock("@/lib/config", () => ({
  SOROBAN_RPC_URL: "https://soroban.test",
  SETTLEMENT_CONTRACT_ID: "CCONTRACT",
  get MERCHANT_ADDRESS() {
    return mockMerchantAddress;
  },
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

const OPEN_LINK = {
  id: "invalid-id-123",
  merchantName: "Merchant Corp",
  label: "Consulting Retainer Q3",
  type: "open",
  currency: "USDC",
  fixedAmount: 0,
  isMultiCurrency: false,
  acceptedCurrencies: ["USDC"],
  expiresAt: null,
};

// ── API call routing ─────────────────────────────────────────────────────────
// The page now issues two kinds of GET: the payment link and, once that link
// is ready, the live USDC/NGN quote from `/api/rates` (issue #1125). A single
// `mockGet` cannot describe both with `mockResolvedValueOnce`, because whoever
// answers second consumes the other's queued value. So tests set the behaviour
// per URL and the recorded calls say which endpoint was actually hit.
type Responder = () => Promise<unknown>;

let linkBehavior: Responder = () => Promise.resolve({ data: OPEN_LINK });
let ratesBehavior: Responder = () => Promise.resolve({ data: { usdcNgn: 1580 } });
const linkCalls: string[] = [];
const ratesCalls: string[] = [];

const pending = () => new Promise<unknown>(() => {});
const linkResolves = (data: unknown) => {
  linkBehavior = () => Promise.resolve({ data });
};
const linkRejects = (error: unknown) => {
  linkBehavior = () => Promise.reject(error);
};
const ratesResolve = (data: unknown) => {
  ratesBehavior = () => Promise.resolve({ data });
};

beforeEach(() => {
  jest.clearAllMocks();
  linkCalls.length = 0;
  ratesCalls.length = 0;
  mockMerchantAddress = "GMERCHANT";
  linkBehavior = () => Promise.resolve({ data: OPEN_LINK });
  ratesBehavior = () => Promise.resolve({ data: { usdcNgn: 1580 } });
  mockGet.mockImplementation((url: string) => {
    if (url === "/api/rates") {
      ratesCalls.push(url);
      return ratesBehavior();
    }
    linkCalls.push(url);
    return linkBehavior();
  });
});

describe("PaymentLinkPage — loading state", () => {
  it("shows a loading placeholder while the link is being resolved", async () => {
    linkBehavior = pending; // never settles
    render(<PaymentLinkPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/loading payment link/i)).toBeInTheDocument();
    expect(screen.queryByTestId("invalid-link-state")).not.toBeInTheDocument();
  });
});

describe("PaymentLinkPage — invalid links (issue #741)", () => {
  it("renders the branded empty state on a 404", async () => {
    linkRejects(makeAxiosError(404));
    render(<PaymentLinkPage />);

    await waitFor(() =>
      expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument(),
    );
    expect(screen.getByText(/no longer valid/i)).toBeInTheDocument();
  });

  it("renders the expired copy when the backend reports expiry", async () => {
    linkRejects(makeAxiosError(410, "This payment link has expired"));
    render(<PaymentLinkPage />);

    await waitFor(() =>
      expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument(),
    );
    expect(screen.getByText(/has expired/i)).toBeInTheDocument();
  });

  it("renders the expired copy for a 403 with an expiry message", async () => {
    linkRejects(makeAxiosError(403, "Link expired on 2026-01-01"));
    render(<PaymentLinkPage />);

    await waitFor(() => expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument());
    expect(screen.getByText(/has expired/i)).toBeInTheDocument();
  });

  it("shows the link id as a support reference", async () => {
    linkRejects(makeAxiosError(404));
    render(<PaymentLinkPage />);

    await waitFor(() => expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument());
    expect(screen.getByText("invalid-id-123")).toBeInTheDocument();
  });

  it("does not offer retry for a definitively invalid link", async () => {
    linkRejects(makeAxiosError(404));
    render(<PaymentLinkPage />);

    await waitFor(() => expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("offers retry for transient failures and recovers on success", async () => {
    let attempt = 0;
    linkBehavior = () => {
      attempt += 1;
      return attempt === 1
        ? Promise.reject(makeAxiosError(500))
        : Promise.resolve({ data: OPEN_LINK });
    };
    render(<PaymentLinkPage />);

    await waitFor(() => expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument());
    expect(screen.getByText(/couldn't load this payment link/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(linkCalls).toHaveLength(2));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Merchant Corp" })).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("invalid-link-state")).not.toBeInTheDocument();
  });

  it("never renders the payment form for an invalid link", async () => {
    linkRejects(makeAxiosError(404));
    render(<PaymentLinkPage />);

    await waitFor(() => expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("0.00")).not.toBeInTheDocument();
  });
});

describe("PaymentLinkPage — valid link renders the payment form", () => {
  it("renders merchant branding and the amount input once resolved", async () => {
    linkResolves(OPEN_LINK);
    render(<PaymentLinkPage />);

    expect(await screen.findByRole("heading", { name: "Merchant Corp" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
    expect(screen.queryByTestId("invalid-link-state")).not.toBeInTheDocument();
  });
});

// ── Live FX quote (issue #1125) ──────────────────────────────────────────────
// The checkout used to show a hardcoded ₦1,580 and "refresh" with a 600ms
// setTimeout. These tests pin the real behaviour: the number comes from
// `/api/rates`, and refreshing calls that endpoint again.
describe("PaymentLinkPage — live FX quote (issue #1125)", () => {
  it("quotes USDC/NGN from the backend once the link is ready", async () => {
    ratesResolve({ usdcNgn: 1725 });
    render(<PaymentLinkPage />);

    await screen.findByRole("heading", { name: "Merchant Corp" });
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "10" } });

    expect(ratesCalls).toContain("/api/rates");
    expect(await screen.findByText("1 USDC ≈ ₦1,725 NGN")).toBeInTheDocument();
    expect(screen.getAllByText("≈ ₦17,250 NGN").length).toBeGreaterThan(0);
    // The old hardcoded figure must not survive anywhere on the page.
    expect(screen.queryAllByText(/1,?580/)).toHaveLength(0);
  });

  it("refreshes the quote by calling the endpoint again", async () => {
    let attempt = 0;
    ratesBehavior = () => {
      attempt += 1;
      return attempt === 1
        ? Promise.reject(makeAxiosError(503, "FX feed unavailable"))
        : Promise.resolve({ data: { usdcNgn: 1725 } });
    };
    render(<PaymentLinkPage />);

    // A failed quote is admitted, not papered over with a stale number.
    expect(await screen.findByText(/FX feed unavailable/i)).toBeInTheDocument();
    expect(screen.getByText("NGN rate unavailable")).toBeInTheDocument();
    expect(ratesCalls).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /refresh quote/i }));

    await waitFor(() => expect(ratesCalls).toHaveLength(2));
    expect(await screen.findByText("1 USDC ≈ ₦1,725 NGN")).toBeInTheDocument();
    expect(screen.queryByText(/FX feed unavailable/i)).not.toBeInTheDocument();
  });

  it("says the rate is unavailable when the feed returns no usable figure", async () => {
    ratesResolve({ rates: [] });
    render(<PaymentLinkPage />);

    await screen.findByRole("heading", { name: "Merchant Corp" });
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "10" } });

    expect(await screen.findByText(/no usable USDC\/NGN rate/i)).toBeInTheDocument();
    expect(screen.getByText("NGN rate unavailable")).toBeInTheDocument();
    expect(screen.getAllByText("NGN estimate unavailable").length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/₦17,|₦1,580/)).toHaveLength(0);
  });
});

// ── SEP-0007 destination (issue #1125) ───────────────────────────────────────
describe("PaymentLinkPage — merchant Stellar address (issue #1125)", () => {
  const REAL_ADDRESS = "GDQZEEQ6RH4ZHVH6HFCPCHWM7JFH7EUJSTW3FQGLTPFNYQ4WFP2K7TDR";

  const openQrPanel = async () => {
    await screen.findByRole("heading", { name: "Merchant Corp" });
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    fireEvent.click(screen.getByRole("button", { name: /mobile \/ qr/i }));
  };

  it("builds the payment URI from the configured merchant address", async () => {
    mockMerchantAddress = REAL_ADDRESS;
    render(<PaymentLinkPage />);
    await openQrPanel();

    const qr = await screen.findByTestId("sep0007-qr");
    expect(qr.getAttribute("data-value")).toContain(`destination=${REAL_ADDRESS}`);
    expect(document.body.textContent).not.toMatch(/GMERCHANT/);
  });

  it("generates no payment URI when the merchant address is missing", async () => {
    mockMerchantAddress = "";
    render(<PaymentLinkPage />);
    await openQrPanel();

    expect(await screen.findByText(/No merchant Stellar address is configured/i)).toBeInTheDocument();
    expect(screen.queryByTestId("sep0007-qr")).not.toBeInTheDocument();
    expect(screen.getAllByText("Not configured").length).toBeGreaterThan(0);
    // The wallet launcher stays inert instead of deep-linking a fake account.
    expect(screen.queryByRole("link", { name: /open in lobstr/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/GMERCHANT/);
  });

  it("imports lucide icons by name and keeps no hardcoded quote or address", () => {
    const source = readFileSync(path.join(process.cwd(), "app/pay/[linkId]/page.tsx"), "utf8");
    expect(source).not.toMatch(/import \* as Icons/);
    expect(source).not.toMatch(/IconWrapper/);
    expect(source).toMatch(/import \{[^}]*ShieldCheck[^}]*\} from ["']lucide-react["']/);
    expect(source).not.toMatch(/1580/);
    expect(source).not.toMatch(/["']GMERCHANT["']/);
  });
});
