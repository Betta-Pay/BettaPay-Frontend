/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DevelopersPage from "../page";
import { apiClient } from "@/lib/api/axios";

const mockNotifySuccess = jest.fn();
const mockNotifyError = jest.fn();

jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: () => ({
    success: mockNotifySuccess,
    error: mockNotifyError,
    info: jest.fn(),
  }),
}));

jest.mock("@/lib/store/offlineStore", () => ({
  useOfflineStore: (selector: any) => selector({ isOnline: true }),
}));

jest.mock("@/lib/api/axios", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock("@/components/developers/WebhookTester", () => ({
  WebhookTester: () => <div data-testid="webhook-tester" />,
}));

jest.mock("@/components/developers/RateLimitDisplay", () => ({
  RateLimitDisplay: () => <div data-testid="rate-limit-display" />,
}));

jest.mock("@/components/developers/KeyUsagePanel", () => ({
  KeyUsagePanel: () => <div data-testid="key-usage-panel" />,
}));

// Mock Select component
jest.mock("@/components/ui/select", () => {
  return {
    Select: ({ value, onValueChange, children }: any) => (
      <select
        aria-label="select-env"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {children}
      </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ value, children }: any) => (
      <option value={value}>{children}</option>
    ),
  };
});

describe("DevelopersPage - API Key Creation (#321)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders existing API keys and New Key button", () => {
    render(<DevelopersPage />);
    expect(screen.getByText("Production Key")).toBeInTheDocument();
    expect(screen.getByText("Sandbox Key")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /New Key/i }),
    ).toBeInTheDocument();
  });

  it('calls apiClient.post("/api/keys") and displays full key in success dialog on creation', async () => {
    const mockCreatedKeyData = {
      id: "key_999",
      name: "Mobile App Service",
      prefix: "bp_test_",
      suffix: "...x9y8",
      key: "bp_test_fullsecretkey999888777",
      created: "2026-07-27",
      lastUsed: "Never",
      type: "test",
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockCreatedKeyData,
    });

    render(<DevelopersPage />);

    // Open create key dialog
    fireEvent.click(screen.getByRole("button", { name: /New Key/i }));

    expect(screen.getByText("Generate API Key")).toBeInTheDocument();

    // Fill in key name
    const input = screen.getByPlaceholderText("e.g. Node.js Payment Worker");
    fireEvent.change(input, { target: { value: "Mobile App Service" } });

    // Submit
    const generateBtn = screen.getByRole("button", { name: "Generate Key" });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/keys", {
        name: "Mobile App Service",
        type: "test",
      });
    });

    // Verify success dialog opens with full API key and warning prompt
    await waitFor(() => {
      expect(screen.getByText("Save Your API Key")).toBeInTheDocument();
      expect(
        screen.getByText("bp_test_fullsecretkey999888777"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Please copy your full API key now/i),
      ).toBeInTheDocument();
    });

    // Verify copy button works
    const copyBtn = screen.getByRole("button", { name: /Copy Key/i });
    fireEvent.click(copyBtn);

    // Close success dialog
    const doneBtn = screen.getByRole("button", {
      name: /Done \/ I've Saved My Key/i,
    });
    fireEvent.click(doneBtn);

    await waitFor(() => {
      expect(
        screen.queryByText("bp_test_fullsecretkey999888777"),
      ).not.toBeInTheDocument();
    });

    // Verify new key is added to table list (masked)
    expect(screen.getByText("Mobile App Service")).toBeInTheDocument();
  });

  it("handles backend creation errors gracefully", async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(
      new Error("Internal Server Error"),
    );

    render(<DevelopersPage />);

    fireEvent.click(screen.getByRole("button", { name: /New Key/i }));

    const input = screen.getByPlaceholderText("e.g. Node.js Payment Worker");
    fireEvent.change(input, { target: { value: "Failed Worker" } });

    const generateBtn = screen.getByRole("button", { name: "Generate Key" });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith("Internal Server Error");
    });
  });
});
