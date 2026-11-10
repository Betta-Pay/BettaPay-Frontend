import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({ linkId: "link_quote_test" }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next/dynamic", () => {
  return (loader: unknown) => {
    void loader;
    return function MockDynamic() {
      return null;
    };
  };
});

jest.mock("@/components/wallet/WalletModalFallback", () => ({
  WalletModalFallback: () => null,
}));
jest.mock("@/components/wallet/WalletModalErrorBoundary", () => ({
  WalletModalErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const walletState = {
  isConnected: false,
  connect: jest.fn(),
  address: null,
  walletModalOpen: false,
  setWalletModalOpen: jest.fn(),
};
jest.mock("@/lib/store/walletStore", () => ({
  useWalletStore: (selector?: (state: typeof walletState) => unknown) =>
    selector ? selector(walletState) : walletState,
}));

jest.mock("@stellar/stellar-sdk", () => ({
  Contract: jest.fn(),
  rpc: { Server: jest.fn() },
  TransactionBuilder: jest.fn(),
  nativeToScVal: jest.fn(),
}));
jest.mock("@/lib/stellar/freighter", () => ({
  signWithFreighter: jest.fn(),
  isFreighterAvailable: () => false,
}));

jest.mock("@/lib/api/axios", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));
import { apiClient } from "@/lib/api/axios";
const mockGet = apiClient.get as jest.Mock;

jest.mock("@/components/payments/CurrencySelector", () => ({
  CurrencySelector: () => null,
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <span aria-label={alt} data-testid="brand-logo" />,
}));

jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn(), silent: jest.fn() }),
}));

jest.mock("@/lib/config", () => ({
  SOROBAN_RPC_URL: "https://soroban.test",
  SETTLEMENT_CONTRACT_ID: "CCONTRACT",
  MERCHANT_ADDRESS: "GMERCHANT",
  STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
}));

jest.mock("@/lib/utils/constants", () => ({
  MULTI_CURRENCY_ASSETS: {
    USDC: { code: "USDC", stroopMultiplier: 10_000_000 },
  },
  MOCK_RATES: {},
  USE_MOCK_RATE_DATA: false,
  PAYMENT_STATUS: {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
    EXPIRED: "expired",
  },
  normalizePaymentStatus: (raw: string) => raw,
}));

import PaymentLinkPage, {
  computeQuoteRemainingSeconds,
  formatQuoteCountdown,
} from "../page";

describe("PaymentLinkPage — Quote Expiration Countdown Timer (#924)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("formats quote countdown and computes remaining seconds from quoteExpiresAt", () => {
    expect(formatQuoteCountdown(272)).toBe("04:32");
    expect(formatQuoteCountdown(600)).toBe("10:00");
    expect(formatQuoteCountdown(0)).toBe("00:00");

    const now = 1_700_000_000_000;
    const expiryIso = new Date(now + 272_000).toISOString();
    expect(computeQuoteRemainingSeconds(expiryIso, now)).toBe(272);
    expect(computeQuoteRemainingSeconds(null, now)).toBe(600);
  });

  it("renders 'Quote expires in MM:SS' pill and prompts user to refresh on expiry", async () => {
    const now = Date.now();
    mockGet.mockResolvedValue({
      data: {
        id: "link_quote_test",
        merchantName: "Acme Merchant",
        label: "Invoice #924",
        type: "fixed",
        currency: "USDC",
        fixedAmount: 100,
        isMultiCurrency: false,
        acceptedCurrencies: ["USDC"],
        expiresAt: null,
        quoteExpiresAt: now + 3_000,
      },
    });

    render(<PaymentLinkPage />);

    const pill = await screen.findByTestId("quote-countdown-pill");
    expect(pill).toHaveTextContent(/Quote expires in 00:03/i);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(pill).toHaveTextContent(/Quote expires in 00:02/i);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(pill).toHaveTextContent(/Quote expired/i);
    expect(
      screen.getByText(/Rate lock expired\. Refresh quote to proceed\./i),
    ).toBeInTheDocument();

    const refreshBtn = screen.getByRole("button", { name: /Refresh Quote/i });
    fireEvent.click(refreshBtn);

    act(() => {
      jest.advanceTimersByTime(700);
    });

    await waitFor(() =>
      expect(screen.getByTestId("quote-countdown-pill")).toHaveTextContent(
        /Quote expires in 10:00/i,
      ),
    );
  });
});
