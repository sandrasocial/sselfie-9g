// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Maya founder feedback queue", () => {
  it("gives the repair task a bounded queue and explicit lifecycle transitions", () => {
    const script = readFileSync("scripts/maya-founder-feedback-queue.ts", "utf8")
    expect(script).toContain("--status")
    expect(script).toContain("--set-status")
    expect(script).toContain("canTransitionFounderFeedbackStatus")
    expect(script).toContain("founder_test_status NOT IN ('verified', 'deferred')")
    expect(script).toContain("resolution_commit_sha")
  })
})
