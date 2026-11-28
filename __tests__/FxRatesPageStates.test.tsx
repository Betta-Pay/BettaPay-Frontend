import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

const mockUseRates = jest.fn();

jest.mock("@/lib/api/hooks", () => ({
  useRates: () => mockUseRates(),
}));

jest.mock("next/dynamic", () => () => function ChartStub() {
  return <div data-testid="chart-stub" />;
});

jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: () => ({
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock("@/lib/store/rateAlertStore", () => ({
  useRateAlertStore: () => ({
    alerts: [],
    addAlert: jest.fn(),
    toggleAlert: jest.fn(),
    deleteAlert: jest.fn(),
    markAlertTriggered: jest.fn(),
    hydrateFromServer: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue(undefined),
  }),
}));

import FxRatesPage from "@/app/(merchant)/fx/page";

function ratesState(overrides: Record<string, unknown> = {}) {
  return {
    data: [
      { from: "USDC", to: "NGN", rate: 1585, change: 1.64, trend: "up" },
    ],
    primaryRate: 1585,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

describe("FxRatesPage loading and error states (Issue #1115)", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders skeleton cards while rates are pending", () => {
    mockUseRates.mockReturnValue(
      ratesState({ data: [], primaryRate: null, isLoading: true, isFetching: true }),
    );

    render(<FxRatesPage />);

    expect(screen.getByRole("status", { name: /loading live fx rates/i })).toBeInTheDocument();
    expect(screen.getAllByTestId("fx-rate-skeleton-card")).toHaveLength(4);
    expect(screen.queryByText(/spot rate · stellar anchor feed/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders skeleton cards on the first fetch even when isLoading is still false", () => {
    mockUseRates.mockReturnValue(
      ratesState({ data: [], primaryRate: null, isFetching: true }),
    );

    render(<FxRatesPage />);

    expect(screen.getByTestId("fx-rates-skeleton")).toBeInTheDocument();
  });

  it("shows an error banner whose Retry button re-triggers useRates", () => {
    const refetch = jest.fn();
    mockUseRates.mockReturnValue(
      ratesState({ isLoading: false, error: "Rates service unavailable", refetch }),
    );

    render(<FxRatesPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load live FX rates");
    expect(screen.getByRole("alert")).toHaveTextContent("Rates service unavailable");
    expect(screen.queryByTestId("fx-rates-skeleton")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders live rates without skeletons or an error banner on success", () => {
    mockUseRates.mockReturnValue(ratesState());

    render(<FxRatesPage />);

    expect(screen.queryByTestId("fx-rates-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByText(/USDC\/NGN/).length).toBeGreaterThan(0);
  });
});
