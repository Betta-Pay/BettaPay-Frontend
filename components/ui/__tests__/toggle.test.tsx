import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "@/components/ui/toggle";

function ControlledToggle({ disabled = false }: { disabled?: boolean }) {
  const [checked, setChecked] = useState(false);
  return (
    <Toggle
      checked={checked}
      label="Auto settlement"
      disabled={disabled}
      onClick={() => setChecked((prev) => !prev)}
    />
  );
}

describe("Toggle accessibility & keyboard support (Issue #872)", () => {
  it("synchronizes aria-pressed and aria-checked with boolean state", () => {
    const { rerender } = render(
      <Toggle checked={false} label="Email alerts" />
    );

    const toggle = screen.getByRole("switch", { name: /email alerts/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Off")).toBeInTheDocument();

    rerender(<Toggle checked={true} label="Email alerts" />);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("On")).toBeInTheDocument();
  });

  it("toggles state on mouse click", async () => {
    const user = userEvent.setup();
    render(<ControlledToggle />);

    const toggle = screen.getByRole("switch", { name: /auto settlement/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("activates toggle on Spacebar and Enter keydown events", () => {
    render(<ControlledToggle />);

    const toggle = screen.getByRole("switch", { name: /auto settlement/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    // Spacebar keydown prevents default scroll and toggles state
    const spaceAllowed = fireEvent.keyDown(toggle, { key: " ", code: "Space" });
    expect(spaceAllowed).toBe(false);
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    // Enter keydown toggles state back
    const enterAllowed = fireEvent.keyDown(toggle, {
      key: "Enter",
      code: "Enter",
    });
    expect(enterAllowed).toBe(false);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("does not double-fire when activated via userEvent keyboard navigation", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<Toggle checked={false} label="Webhook retry" onClick={onClick} />);

    const toggle = screen.getByRole("switch", { name: /webhook retry/i });
    toggle.focus();
    expect(toggle).toHaveFocus();

    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);

    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("does not toggle when disabled via click or keyboard", () => {
    const onClick = jest.fn();
    render(
      <Toggle
        checked={false}
        label="Disabled toggle"
        disabled
        onClick={onClick}
      />
    );

    const toggle = screen.getByRole("switch", { name: /disabled toggle/i });
    expect(toggle).toBeDisabled();

    fireEvent.click(toggle);
    fireEvent.keyDown(toggle, { key: " " });
    fireEvent.keyDown(toggle, { key: "Enter" });

    expect(onClick).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });
});
