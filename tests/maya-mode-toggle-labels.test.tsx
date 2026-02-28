import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import MayaModeToggle from "@/components/sselfie/maya/maya-mode-toggle"

describe("MayaModeToggle labels", () => {
  it("uses MY MODEL and SELFIE labels in compact mode", () => {
    render(<MayaModeToggle currentMode="classic" onToggle={vi.fn()} variant="compact" />)

    expect(screen.getByRole("button", { name: /switch to my model/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /switch to selfie/i })).toBeInTheDocument()
    expect(screen.getByText("MY MODEL")).toBeInTheDocument()
    expect(screen.getByText("SELFIE")).toBeInTheDocument()
  })

  it("uses rename labels in button variant", () => {
    render(<MayaModeToggle currentMode="classic" onToggle={vi.fn()} variant="button" />)

    expect(screen.getByRole("button", { name: /switch to selfie/i })).toBeInTheDocument()
    expect(screen.getByText("Switch to SELFIE")).toBeInTheDocument()
  })
})
