import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}))

vi.mock("@/lib/analytics/client", () => ({
  trackAnalyticsEvent: vi.fn(() => Promise.resolve()),
}))

import WelcomeFirstGenerationFlow from "@/components/sselfie/maya/welcome-first-generation-flow"

describe("WelcomeFirstGenerationFlow", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ items: [] }),
      })),
    )
  })

  it("skips the mode step for users without a trained model", async () => {
    render(<WelcomeFirstGenerationFlow onDone={vi.fn()} userHasTrainedModel={false} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/prompt-guides/items")
    })

    fireEvent.click(screen.getByRole("button", { name: "This one" }))

    expect(screen.getByText("STEP 3: GENERATE")).toBeInTheDocument()
    expect(screen.queryByText("STEP 2: PICK YOUR MODE")).not.toBeInTheDocument()
  })
})
