import { describe, expect, it } from "vitest"

import { pickPreferredSubscription } from "@/lib/subscription"

describe("pickPreferredSubscription", () => {
  it("prefers live subscriptions over test subscriptions when live-only mode is enabled", () => {
    const picked = pickPreferredSubscription(
      [
        {
          product_type: "sselfie_studio_membership",
          status: "active",
          created_at: "2026-03-01T00:00:00.000Z",
          is_test_mode: true,
        },
        {
          product_type: "sselfie_studio_membership",
          status: "active",
          created_at: "2026-02-01T00:00:00.000Z",
          is_test_mode: false,
        },
      ],
      { liveOnly: true },
    )

    expect(picked?.is_test_mode).toBe(false)
  })

  it("returns null in live-only mode when only test subscriptions exist", () => {
    const picked = pickPreferredSubscription(
      [
        {
          product_type: "sselfie_studio_membership",
          status: "active",
          created_at: "2026-03-01T00:00:00.000Z",
          is_test_mode: true,
        },
      ],
      { liveOnly: true },
    )

    expect(picked).toBeNull()
  })

  it("can fall back to test subscriptions in non-live-only mode", () => {
    const picked = pickPreferredSubscription(
      [
        {
          product_type: "sselfie_studio_membership",
          status: "active",
          created_at: "2026-03-01T00:00:00.000Z",
          is_test_mode: true,
        },
      ],
      { liveOnly: false },
    )

    expect(picked?.is_test_mode).toBe(true)
  })
})
