import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { InvalidPaymentLinkState } from "@/components/payments/InvalidPaymentLinkState";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Expired payment link error state (#937)", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders the expired payment link alert, explanation text, reference ID, and homepage redirect action", () => {
    render(<InvalidPaymentLinkState reason="expired" linkId="pl_e2e_expired" />);

    expect(screen.getByTestId("invalid-link-state")).toBeInTheDocument();
    expect(screen.getByText(/this payment link has expired/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this payment request is no longer open for payment/i),
    ).toBeInTheDocument();
    expect(screen.getByText("pl_e2e_expired")).toBeInTheDocument();

    const homeBtn = screen.getByRole("button", { name: /go to homepage/i });
    fireEvent.click(homeBtn);
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
