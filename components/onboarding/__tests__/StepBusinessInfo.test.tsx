import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepBusinessInfo } from "../StepBusinessInfo";
import type { OnboardingData } from "@/app/onboarding/page";

const baseData = {
  businessName: "Acme",
  businessType: "business",
  country: "Nigeria",
} as OnboardingData;

function renderStep(overrides: Partial<React.ComponentProps<typeof StepBusinessInfo>> = {}) {
  const onChange = jest.fn();
  render(<StepBusinessInfo data={baseData} errors={{}} onChange={onChange} {...overrides} />);
  return { onChange, trigger: screen.getByRole("combobox", { name: "Country" }) };
}

describe("StepBusinessInfo country select (issue #713)", () => {
  it("renders the design-system Select, named by its label, showing the current value", () => {
    const { trigger } = renderStep();
    expect(trigger).toHaveAttribute("data-slot", "select-trigger");
    expect(trigger).toHaveTextContent("Nigeria");
    expect(document.querySelector("select")).toBeNull();
  });

  it("selects a country with the mouse", async () => {
    const user = userEvent.setup();
    const { onChange, trigger } = renderStep();

    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Kenya" }));

    expect(onChange).toHaveBeenCalledWith({ country: "Kenya" });
  });

  it("selects a country with the keyboard (arrow keys + Enter)", async () => {
    const user = userEvent.setup();
    const { onChange, trigger } = renderStep();

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(screen.getByRole("option", { name: "Ghana" })).toHaveFocus());
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith({ country: "Ghana" });
  });

  it("exposes validation errors to assistive tech", () => {
    const { trigger } = renderStep({ data: { ...baseData, country: "" }, errors: { country: "Select your country." } });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("Select your country.");
    expect(trigger).toHaveTextContent("Select your country");
  });
});
