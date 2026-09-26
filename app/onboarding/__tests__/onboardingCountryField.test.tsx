import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingPage from "../page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

jest.mock("@/lib/store/authStore", () => ({
  useAuthStore: () => ({ user: { id: "m_1", role: "merchant" } }),
}));

jest.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: { rates: [] } }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

// The currency step needs a QueryClientProvider; stub the rate lookup so this
// suite stays focused on the country field.
jest.mock("@/lib/api/hooks", () => ({
  useRates: () => ({ data: [], isLoading: false, primaryRate: null }),
}));

/**
 * The country Select is rendered by the real StepBusinessInfo here (no mocks),
 * so this exercises the whole path the issue asks for: shadcn Select ->
 * Controller -> React Hook Form -> wizard validation and navigation.
 */
describe("Onboarding business info step - country Select wired into the form (issue #754)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
  });

  const seedDraftWithoutCountry = () => {
    localStorage.setItem(
      "bettapay_onboarding_progress",
      JSON.stringify({
        step: 0,
        data: {
          businessName: "Acme Corp",
          businessType: "business",
          country: "",
          settlementCurrency: "NGN",
          autoConvert: true,
          preferredAnchor: "Cowry",
          autoSettle: true,
          webhookUrl: "",
        },
        savedAt: Date.now(),
      })
    );
  };

  const resumeAndRender = async () => {
    seedDraftWithoutCountry();
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await user.click(screen.getByRole("button", { name: /Resume/i }));
    return user;
  };

  it("blocks Continue and surfaces the schema message when no country is selected", async () => {
    const user = await resumeAndRender();

    await user.click(screen.getByRole("button", { name: /Continue/i }));

    expect(await screen.findByText("Select your country.")).toBeInTheDocument();
    // Still on the business info step.
    expect(screen.getByRole("heading", { name: /Business information/i })).toBeInTheDocument();
  });

  it("clears the error once a country is picked and moves to the next step", async () => {
    const user = await resumeAndRender();

    await user.click(screen.getByRole("button", { name: /Continue/i }));
    expect(await screen.findByText("Select your country.")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Country" }));
    await user.click(await screen.findByRole("option", { name: "Kenya" }));
    await waitFor(() => expect(screen.queryByText("Select your country.")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Continue/i }));

    expect(await screen.findByRole("heading", { name: /Default settlement currency/i })).toBeInTheDocument();
  });

  it("persists the selected country in the saved draft", async () => {
    const user = await resumeAndRender();

    await user.click(screen.getByRole("combobox", { name: "Country" }));
    await user.click(await screen.findByRole("option", { name: "South Africa" }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem("bettapay_onboarding_progress")!);
      expect(saved.data.country).toBe("South Africa");
    });
  });
});

/**
 * The later steps keep their existing checks, but the messages now travel
 * through the same form instance instead of local state, so both paths are
 * covered here.
 */
describe("Onboarding later steps report validation through the form (issue #754)", () => {
  const seedDraft = (step: number, overrides: Record<string, unknown>) => {
    localStorage.setItem(
      "bettapay_onboarding_progress",
      JSON.stringify({
        step,
        data: {
          businessName: "Acme Corp",
          businessType: "business",
          country: "Nigeria",
          settlementCurrency: "NGN",
          autoConvert: true,
          preferredAnchor: "Cowry",
          autoSettle: true,
          webhookUrl: "",
          ...overrides,
        },
        savedAt: Date.now(),
      })
    );
  };

  const resumeAt = async (step: number, overrides: Record<string, unknown>) => {
    seedDraft(step, overrides);
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await user.click(screen.getByRole("button", { name: /Resume/i }));
    return user;
  };

  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
  });

  it("blocks Continue on the currency step when nothing is selected", async () => {
    const user = await resumeAt(1, { settlementCurrency: "" });

    await user.click(screen.getByRole("button", { name: /Continue/i }));

    expect(await screen.findByText("Choose a settlement currency.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Default settlement currency/i })).toBeInTheDocument();
  });

  it("surfaces the settlement schema message for an invalid account number", async () => {
    const user = await resumeAt(2, { accountNumber: "123" });

    await user.click(screen.getByRole("button", { name: /Continue/i }));

    expect(await screen.findByText(/Invalid account number or IBAN format/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Settlement preferences/i })).toBeInTheDocument();
  });
});
