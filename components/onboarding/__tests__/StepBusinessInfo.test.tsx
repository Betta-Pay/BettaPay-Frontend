import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StepBusinessInfo } from "../StepBusinessInfo";
import { businessInfoSchema } from "@/lib/utils/onboardingSchemas";
import type { OnboardingData } from "@/app/onboarding/page";

const baseData = {
  businessName: "Acme",
  businessType: "business",
  country: "Nigeria",
} as OnboardingData;

type FormApi = {
  getValues: () => OnboardingData;
  trigger: (fields: string[]) => Promise<boolean>;
  getError: (field: keyof OnboardingData) => string | undefined;
};
let formApi: FormApi | null = null;

/**
 * Renders the step inside a real form instance so the country Select is bound
 * through `Controller`, exactly as the onboarding page wires it.
 */
function Harness({ data, errors, onChange }: Omit<React.ComponentProps<typeof StepBusinessInfo>, "control">) {
  const { control, getValues, trigger, formState } = useForm<OnboardingData>({
    resolver: zodResolver(businessInfoSchema) as unknown as never,
    defaultValues: data,
  });
  // `formState.errors` is read during render on purpose: RHF's formState is a
  // proxy that only subscribes to the keys a component actually touches.
  const { errors: formErrors } = formState;
  formApi = {
    getValues,
    trigger: trigger as unknown as FormApi["trigger"],
    getError: (field) => (formErrors as Record<string, { message?: string }>)[field]?.message,
  };
  return <StepBusinessInfo data={data} errors={errors} onChange={onChange} control={control as Control<OnboardingData>} />;
}

function renderStep(overrides: Partial<React.ComponentProps<typeof StepBusinessInfo>> = {}) {
  const onChange = jest.fn();
  render(<Harness data={baseData} errors={{}} onChange={onChange} {...overrides} />);
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

describe("StepBusinessInfo country select is registered with React Hook Form (issue #754)", () => {
  it("writes the picked country into form state, not just the page callback", async () => {
    const user = userEvent.setup();
    const { trigger } = renderStep();

    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Kenya" }));

    expect(formApi?.getValues().country).toBe("Kenya");
  });

  it("validates the field through the form resolver when country is missing", async () => {
    renderStep({ data: { ...baseData, country: "" } });

    await waitFor(async () => expect(await formApi?.trigger(["country"])).toBe(false));
    expect(formApi?.getError("country")).toBe("Select your country.");
  });

  it("passes validation once a country is selected", async () => {
    const user = userEvent.setup();
    const { trigger } = renderStep({ data: { ...baseData, country: "" } });

    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Ghana" }));

    await waitFor(async () => expect(await formApi?.trigger(["country"])).toBe(true));
  });
});
