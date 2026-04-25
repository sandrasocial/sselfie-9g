import { fireEvent, render, screen } from "@testing-library/react"
import type React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

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
  Object.defineProperty(window, "scrollTo", {
    writable: true,
    value: vi.fn(),
  })

  beforeEach(() => {
    const store = new Map<string, string>()
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
    })
    window.localStorage.setItem(
      "sselfie-guide-progress",
      JSON.stringify({
        chapterIndex: 0,
        challengeDays: [],
        personalization: { phoneType: "iphone-15-16", postingFrequency: "sometimes" },
      }),
    )
  })

  it("renders chapter navigation and supporting visuals for the active chapter", () => {
    const markdown = [
      "## PART 1: Your iPhone Camera Settings",
      "Camera chapter body.",
      "## PART 2: Light Changes Everything",
      "Lighting chapter body.",
    ].join("\n")

    render(<SelfieGuideExperience firstName="SANDRA" guideMarkdown={markdown} />)

    fireEvent.click(screen.getByRole("button", { name: "Mark complete →" }))

    expect(
      screen.getByRole("heading", { name: "PART 2: Light Changes Everything" })
    ).toBeInTheDocument()
    expect(
      screen.getAllByAltText(/Sandra standing beside a bright window/i).length
    ).toBeGreaterThan(0)
  })

  it("toggles checklist items rendered from markdown task syntax", () => {
    const markdown = ["## PART 1: Checklist", "- [ ] Turn on Grid", "- Normal list item"].join("\n")

    render(<SelfieGuideExperience firstName="SANDRA" guideMarkdown={markdown} />)

    const checklistButton = screen.getByRole("button", { name: 'Mark "Turn on Grid" as complete' })
    expect(checklistButton).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(checklistButton)
    expect(
      screen.getByRole("button", { name: 'Mark "Turn on Grid" as incomplete' })
    ).toHaveAttribute("aria-pressed", "true")

    expect(screen.getByText("Normal list item")).toBeInTheDocument()
  })

  it("renders and toggles the 7-day challenge tracker in challenge chapters", () => {
    const markdown = ["## PART 7: Your 7-Day Challenge", "Challenge chapter body."].join("\n")

    render(<SelfieGuideExperience firstName="SANDRA" guideMarkdown={markdown} />)

    expect(screen.getByText("Window Light Selfie")).toBeInTheDocument()
    expect(screen.getByText("Post It")).toBeInTheDocument()

    const dayOneCard = screen.getByRole("button", { name: "Mark Day 1 as done" })
    expect(dayOneCard).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(dayOneCard)
    expect(screen.getByRole("button", { name: "Mark Day 1 as complete" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  it("renders the original settings walkthrough pages for the settings marker", () => {
    const markdown = [
      "## PART 1: Your iPhone Camera Settings",
      "[IMAGE: iphone-settings-mockup.png — iPhone Settings → Camera screen showing Grid, Mirror Front Camera, Smart HDR enabled and Live Photos disabled]",
    ].join("\n")

    render(<SelfieGuideExperience firstName="SANDRA" guideMarkdown={markdown} />)

    expect(screen.getByRole("img", { name: /Original settings walkthrough page 1/i })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /Original settings walkthrough page 2/i })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /Original settings walkthrough page 3/i })).toBeInTheDocument()
  })

  it("renders the lighting comparison as four separate original examples", () => {
    const markdown = [
      "## PART 2: Light Changes Everything",
      "[IMAGE: lighting-comparison-grid.png — Four-panel lighting comparison showing window light, golden hour, ring light, and cloudy day examples]",
    ].join("\n")

    render(<SelfieGuideExperience firstName="SANDRA" guideMarkdown={markdown} />)

    expect(screen.getByText("Window / natural light")).toBeInTheDocument()
    expect(screen.getByText("Golden hour")).toBeInTheDocument()
    expect(screen.getByText("Ring light")).toBeInTheDocument()
    expect(screen.getByText("Cloudy day")).toBeInTheDocument()
  })

  it("renders the v3 result image marker for Maya sections", () => {
    const markdown = [
      "## PART 8: Meet Maya, Your AI Brand Partner",
      "[IMAGE: feed-post-3.png — Sandra's brand photo with consistent editorial style and cohesive aesthetic]",
    ].join("\n")

    render(<SelfieGuideExperience firstName="SANDRA" guideMarkdown={markdown} />)

    expect(
      screen.getByRole("img", { name: /Sandra's brand photo with consistent editorial style/i })
    ).toBeInTheDocument()
    expect(screen.getByText("THE RESULT")).toBeInTheDocument()
  })

  it("uses the approved guide CTA routes for Maya, brand strategy, and membership", () => {
    const markdown = [
      "## PART 8: Meet Maya, Your AI Brand Partner",
      "[Open Maya in Studio](/auth/sign-up?returnTo=%2Fstudio%3Ftab%3Dmaya)",
      "[Get the $19 Brand Strategy](/checkout/brand-strategy-pack)",
      "[Join Studio Membership](/checkout/membership)",
    ].join("\n\n")

    render(<SelfieGuideExperience firstName="SANDRA" guideMarkdown={markdown} />)

    expect(screen.getByRole("link", { name: "Open Maya in Studio" })).toHaveAttribute(
      "href",
      "/auth/sign-up?returnTo=%2Fstudio%3Ftab%3Dmaya"
    )
    expect(screen.getByRole("link", { name: "Get the $19 Brand Strategy" })).toHaveAttribute(
      "href",
      "/checkout/brand-strategy-pack"
    )
    expect(screen.getByRole("link", { name: "Join Studio Membership" })).toHaveAttribute(
      "href",
      "/checkout/membership"
    )
  })

  it("shows a single short brand strategy upsell at the end of the guide", () => {
    const markdown = ["## PART 1: Intro", "Short body."].join("\n")

    render(<SelfieGuideExperience firstName="SANDRA" guideMarkdown={markdown} />)

    expect(screen.getByText("Get your Brand Strategy")).toBeInTheDocument()
    expect(
      screen.getByText("Turn the visuals into a message people actually remember.")
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Checkout Brand Strategy Pack" })).toHaveAttribute(
      "href",
      "/checkout/brand-strategy-pack"
    )
    expect(screen.queryByRole("link", { name: "Join Studio Membership" })).not.toBeInTheDocument()
  })

  it("shows the preset bundle CTA when a preset URL is available", () => {
    const markdown = ["## PART 1: Intro", "Short body."].join("\n")

    render(
      <SelfieGuideExperience
        firstName="SANDRA"
        guideMarkdown={markdown}
        presetDownloadUrl="https://example.com/presets"
      />
    )

    expect(screen.getByRole("link", { name: "Open preset pack" })).toHaveAttribute(
      "href",
      "https://example.com/presets"
    )
  })
})
