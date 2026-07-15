// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { VisualFrontDoor } from "@/components/app-v3/visual-front-door"

const mocks = vi.hoisted(() => ({
  openWithAesthetic: vi.fn(),
  trackAnalyticsEvent: vi.fn(),
}))

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} />
  ),
}))

vi.mock("@/components/app-v3/concierge-context", () => ({
  useConcierge: () => ({ openWithAesthetic: mocks.openWithAesthetic }),
}))

vi.mock("@/lib/analytics/client", () => ({
  trackAnalyticsEvent: mocks.trackAnalyticsEvent,
}))

describe("MAYA_PRESELFIE_CHAT_ENABLED", () => {
  beforeEach(() => {
    mocks.openWithAesthetic.mockReset()
    mocks.trackAnalyticsEvent.mockReset()
    mocks.trackAnalyticsEvent.mockResolvedValue(undefined)
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
      },
    })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ aesthetics: [] }) })
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("renders no pre-selfie question link when the flag is off", () => {
    render(<VisualFrontDoor hasSelfie={false} preSelfieChatEnabled={false} />)

    expect(
      screen.queryByRole("button", { name: "Have a question first? Ask Maya" })
    ).not.toBeInTheDocument()
  })

  it("opens plain Maya chat when the flag is on", () => {
    render(<VisualFrontDoor hasSelfie={false} preSelfieChatEnabled />)

    fireEvent.click(screen.getByRole("button", { name: "Have a question first? Ask Maya" }))

    expect(mocks.openWithAesthetic).toHaveBeenCalledWith(
      expect.objectContaining({ id: "maya-general" }),
      expect.objectContaining({
        creationIntent: {
          format: null,
          source: "manual",
          confidence: "needs_clarify",
        },
        initialSetupAction: "plain_chat",
      })
    )
  })
})
