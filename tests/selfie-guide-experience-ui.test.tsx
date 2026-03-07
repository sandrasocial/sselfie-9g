import { fireEvent, render, screen } from "@testing-library/react"
import type React from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ""} />
  },
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next/font/google", () => ({
  Cormorant_Garamond: () => ({ className: "font-cormorant" }),
  Inter: () => ({ className: "font-inter" }),
}))

import SelfieGuideExperience from "@/components/freebie/selfie-guide-experience"

describe("SelfieGuideExperience interactive features", () => {
  it("toggles checklist items rendered from markdown task syntax", () => {
    const markdown = ["## PART 1: Checklist", "- [ ] Turn on Grid", "- Normal list item"].join("\n")

    render(<SelfieGuideExperience firstName="SANDRA" guideMarkdown={markdown} />)

    const checklistButton = screen.getByRole("button", { name: 'Mark "Turn on Grid" as complete' })
    expect(checklistButton).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(checklistButton)
    expect(screen.getByRole("button", { name: 'Mark "Turn on Grid" as incomplete' })).toHaveAttribute(
      "aria-pressed",
      "true",
    )

    expect(screen.getByText("Normal list item")).toBeInTheDocument()
  })

  it("renders and toggles the 7-day challenge tracker in challenge chapters", () => {
    const markdown = ["## PART 7: Your 7-Day Challenge", "Challenge chapter body."].join("\n")

    render(<SelfieGuideExperience firstName="SANDRA" guideMarkdown={markdown} />)

    expect(screen.getByText("Window Light Selfie")).toBeInTheDocument()
    expect(screen.getByText("Post It")).toBeInTheDocument()

    const dayOneCard = screen.getByRole("button", { name: "Mark Day 1 as complete" })
    expect(dayOneCard).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(dayOneCard)
    expect(screen.getByRole("button", { name: "Mark Day 1 as incomplete" })).toHaveAttribute("aria-pressed", "true")
  })
})
