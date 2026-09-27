import React from "react"
import { render, screen } from "@testing-library/react"
import { Alert, AlertTitle, AlertDescription } from "../alert"

describe("Alert component", () => {
  it("renders success variant with semantic success classes", () => {
    render(
      <Alert variant="success" data-testid="success-alert">
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>Operation completed successfully.</AlertDescription>
      </Alert>
    )

    const alert = screen.getByTestId("success-alert")
    expect(alert).toBeInTheDocument()
    expect(alert.className).toContain("bg-success/10")
    expect(alert.className).toContain("text-success")
    expect(alert.className).toContain("border-success/30")
  })

  it("renders warning variant with semantic warning classes", () => {
    render(
      <Alert variant="warning" data-testid="warning-alert">
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Please proceed with caution.</AlertDescription>
      </Alert>
    )

    const alert = screen.getByTestId("warning-alert")
    expect(alert).toBeInTheDocument()
    expect(alert.className).toContain("bg-warning/10")
    expect(alert.className).toContain("text-warning")
    expect(alert.className).toContain("border-warning/30")
  })
})
