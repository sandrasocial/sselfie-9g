import { describe, expect, it } from "vitest"

import { normalizeEmailAddress, computeBroadcastPreflight } from "@/lib/email/broadcast-preflight"

describe("broadcast preflight", () => {
  it("normalizes emails consistently", () => {
    expect(normalizeEmailAddress("  Sandra@Sselfie.ai ")).toBe("sandra@sselfie.ai")
    expect(normalizeEmailAddress(" ")).toBeNull()
    expect(normalizeEmailAddress(undefined)).toBeNull()
  })

  it("deduplicates and suppresses bounced recipients", () => {
    const result = computeBroadcastPreflight({
      audienceEmails: [
        "a@example.com",
        "A@example.com",
        "b@example.com",
        "invalid",
        "",
      ],
      suppressedEmails: ["a@example.com"],
    })

    expect(result.totalAudience).toBe(2)
    expect(result.suppressedCount).toBe(1)
    expect(result.sendableCount).toBe(1)
    expect(result.sendableEmails).toEqual(["b@example.com"])
  })

  it("blocks send when all recipients are suppressed", () => {
    const result = computeBroadcastPreflight({
      audienceEmails: ["a@example.com", "b@example.com"],
      suppressedEmails: ["a@example.com", "b@example.com"],
    })

    expect(result.sendableCount).toBe(0)
  })
})
