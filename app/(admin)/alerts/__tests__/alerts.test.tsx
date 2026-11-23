import React from "react";
import { render, screen } from "@testing-library/react";
import AdminAlertsPage from "../page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

jest.mock("@/lib/alerts/useAlertFeed", () => ({
  useAlertFeed: () => ({
    events: [
      {
        id: "alert-1",
        title: "High Settlement Failure Rate",
        message: "Failure rate exceeded 5%",
        severity: "critical",
        status: "open",
        createdAt: "2026-10-22T10:00:00Z",
      },
      {
        id: "alert-2",
        title: "Invalid Timestamp Alert",
        message: "Metric spike",
        severity: "warning",
        status: "acknowledged",
        createdAt: "not-a-valid-date",
        acknowledgedAt: "also-invalid",
        acknowledgedBy: "admin",
      },
    ],
    rules: [
      {
        id: "rule-1",
        name: "Settlement failure rate",
        threshold: 5,
        unit: "%",
        windowMinutes: 15,
        severity: "critical",
        enabled: true,
      },
    ],
    loaded: true,
    paused: false,
    error: null,
    unreadCount: 1,
    acknowledge: jest.fn(),
    resolve: jest.fn(),
    simulate: jest.fn(),
  }),
}));

describe("AdminAlertsPage (issue #1123)", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env = { ...process.env, NODE_ENV: originalEnv };
  });

  it("renders alerts and handles invalid timestamp in AlertRow returning 'Unknown' without throwing", () => {
    render(<AdminAlertsPage />);
    expect(screen.getByText("High Settlement Failure Rate")).toBeInTheDocument();
    expect(screen.getByText("Invalid Timestamp Alert")).toBeInTheDocument();
    expect(screen.getByText(/Raised Unknown/)).toBeInTheDocument();
  });

  it("hides SimulateMetricPanel in production builds", () => {
    process.env = { ...process.env, NODE_ENV: "production" };
    render(<AdminAlertsPage />);
    expect(screen.queryByText(/Simulate/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Trigger/i })).not.toBeInTheDocument();
  });
});
