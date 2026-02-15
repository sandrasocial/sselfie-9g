import { describe, expect, it } from "vitest"

import { toSegmentSyncEmailLogEntry } from "@/lib/audience/segment-sync-log"

describe("toSegmentSyncEmailLogEntry", () => {
  it("writes failure status with error message", () => {
    const entry = toSegmentSyncEmailLogEntry({
      email: "user@example.com",
      tagsUpdated: false,
      error: "Rate limit",
    })

    expect(entry.status).toBe("failed")
    expect(entry.errorMessage).toBe("Rate limit")
  })

  it("writes success status without error message", () => {
    const entry = toSegmentSyncEmailLogEntry({
      email: "user@example.com",
      tagsUpdated: true,
      error: "ignored",
    })

    expect(entry.status).toBe("success")
    expect(entry.errorMessage).toBeNull()
  })
})
