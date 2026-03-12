import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/feedback/feedback-modal", () => ({
  FeedbackModal: () => null,
}))

import { FeedbackButton } from "@/components/feedback/feedback-button"

describe("FeedbackButton", () => {
  it("anchors itself above the measured bottom nav instead of using a hard-coded mobile offset", () => {
    render(<FeedbackButton userId="user_123" />)

    const button = screen.getByRole("button", { name: /send feedback/i })

    expect(button.className).not.toContain("bottom-32")
    expect(button).toHaveStyle({
      bottom: "calc(var(--sselfie-bottom-nav-height, 96px) + max(0.75rem, env(safe-area-inset-bottom, 0px)))",
    })
  })
})
