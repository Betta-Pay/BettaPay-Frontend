import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingPage from "../page";
import { apiClient } from "@/lib/api/axios";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

jest.mock("@/lib/store/authStore", () => ({
  useAuthStore: () => ({ user: { id: "m_1", role: "merchant" } }),
}));

jest.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

describe("Onboarding Page - Review Step Re-validation and Drift Detection", () => {
  const mockGet = apiClient.get as jest.Mock;
  const mockPatch = apiClient.patch as jest.Mock;

  beforeEach(() => {
    mockGet.mockReset();
    mockPatch.mockClear();
    localStorage.clear();
  });

  const seedProgressAndRender = async () => {
    // Seed localStorage with progress pointing to the Review step (last step).
    localStorage.setItem(
      "bettapay_onboarding_progress",
      JSON.stringify({
        step: 5,
        data: {
          businessName: "Acme Corp",
          businessType: "business",
          country: "Nigeria",
          settlementCurrency: "USD",
          autoConvert: true,
          preferredAnchor: "Cowry",
          autoSettle: true,
          webhookUrl: "https://example.com/webhook",
        },
        savedAt: Date.now(),
      })
    );

    const user = userEvent.setup();
    render(<OnboardingPage />);

    // Click resume button in the resume prompt overlay
    const resumeButton = screen.getByRole("button", { name: /Resume/i });
    await user.click(resumeButton);

    return user;
  };

  it("triggers re-validation and enables Finish button on success", async () => {
    let resolveAnchors: () => void;
    let resolveRates: () => void;
    const anchorsPromise = new Promise((resolve) => {
      resolveAnchors = () =>
        resolve({
          data: {
            data: [{ name: "Cowrie Integrated", code: "COWRIE", enabled: true }],
          },
        });
    });
    const ratesPromise = new Promise((resolve) => {
      resolveRates = () =>
        resolve({
          data: {
            rates: [{ from: "USD", to: "NGN", rate: 1550 }],
          },
        });
    });

    mockGet.mockImplementation((url: string) => {
      if (url === "/api/anchors") return anchorsPromise;
      if (url === "/api/rates") return ratesPromise;
      return Promise.reject(new Error("Unexpected GET call"));
    });

    await seedProgressAndRender();

    // Verify loading state is shown
    expect(
      screen.getByText(/Verifying your setup against backend configuration/i)
    ).toBeInTheDocument();

    // Resolve the promises
    resolveAnchors();
    resolveRates();

    // Wait for validation to finish and Finish button to be enabled
    await waitFor(() => {
      expect(
        screen.queryByText(/Verifying your setup against backend configuration/i)
      ).not.toBeInTheDocument();
    });

    const finishButton = screen.getByRole("button", { name: /Finish setup/i });
    expect(finishButton).not.toBeDisabled();
  });

  it("flags drift and disables Finish button when settlement currency is not supported", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/anchors") {
        return Promise.resolve({
          data: {
            data: [{ name: "Cowrie Integrated", code: "COWRIE", enabled: true }],
          },
        });
      }
      if (url === "/api/rates") {
        // Return rates that do NOT contain USD
        return Promise.resolve({
          data: {
            rates: [{ from: "KES", to: "NGN", rate: 12.5 }],
          },
        });
      }
      return Promise.reject(new Error("Unexpected GET call"));
    });

    await seedProgressAndRender();

    await waitFor(() => {
      expect(screen.getByText(/Configuration drift detected/i)).toBeInTheDocument();
    });

    // Check that currency is highlighted as drifted
    expect(screen.getByText(/Outdated \/ Drifted/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This preference is no longer supported by the current backend config/i)
    ).toBeInTheDocument();

    const finishButton = screen.getByRole("button", { name: /Finish setup/i });
    expect(finishButton).toBeDisabled();
  });

  it("flags drift and disables Finish button when preferred anchor is not supported", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/anchors") {
        // Return anchors list that does NOT contain Cowrie
        return Promise.resolve({
          data: {
            data: [{ name: "Tempo Payments", code: "TEMPO", enabled: true }],
          },
        });
      }
      if (url === "/api/rates") {
        return Promise.resolve({
          data: {
            rates: [{ from: "USD", to: "NGN", rate: 1550 }],
          },
        });
      }
      return Promise.reject(new Error("Unexpected GET call"));
    });

    await seedProgressAndRender();

    await waitFor(() => {
      expect(screen.getByText(/Configuration drift detected/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Outdated \/ Drifted/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This preference is no longer supported by the current backend config/i)
    ).toBeInTheDocument();

    const finishButton = screen.getByRole("button", { name: /Finish setup/i });
    expect(finishButton).toBeDisabled();
  });

  it("shows connection error warning and retry option when API calls fail", async () => {
    mockGet.mockRejectedValue(new Error("Network Error"));

    const user = await seedProgressAndRender();

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to connect to the backend to verify configuration/i)
      ).toBeInTheDocument();
    });

    const finishButton = screen.getByRole("button", { name: /Finish setup/i });
    expect(finishButton).toBeDisabled();

    // Verify Retry button is present
    const retryButton = screen.getByRole("button", { name: /Retry verification/i });
    expect(retryButton).toBeInTheDocument();

    // Mock success for retry
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/anchors") {
        return Promise.resolve({
          data: {
            data: [{ name: "Cowrie Integrated", code: "COWRIE", enabled: true }],
          },
        });
      }
      if (url === "/api/rates") {
        return Promise.resolve({
          data: {
            rates: [{ from: "USD", to: "NGN", rate: 1550 }],
          },
        });
      }
      return Promise.reject(new Error("Unexpected GET call"));
    });

    await user.click(retryButton);

    await waitFor(() => {
      expect(
        screen.queryByText(/Failed to connect to the backend to verify configuration/i)
      ).not.toBeInTheDocument();
    });

    expect(finishButton).not.toBeDisabled();
  });
});
