import React from "react"
import { render, screen } from "@testing-library/react"
import { Select, SelectTrigger, SelectValue } from "../select"

describe("Select component", () => {
  it("renders trigger with correct flex alignment and icon container styling", () => {
    render(
      <Select value="option1">
        <SelectTrigger data-testid="select-trigger">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
      </Select>
    )

    const trigger = screen.getByTestId("select-trigger")
    expect(trigger).toBeInTheDocument()
    expect(trigger.className).toContain("flex")
    expect(trigger.className).toContain("items-center")
    expect(trigger.className).toContain("justify-between")
  })
})
