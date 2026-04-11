import { describe, expect, it } from "vitest"
import { randomFeedPlannerIdempotencyKey, stableFeedPlannerIdempotencyKey } from "@/lib/feed-planner/idempotency"

describe("feed planner idempotency key helpers", () => {
  it("produces stable key for same payload", () => {
    const payload = { feedId: 123, mode: "pro", saveToPlanner: true }
    const first = stableFeedPlannerIdempotencyKey("feed-create", payload)
    const second = stableFeedPlannerIdempotencyKey("feed-create", payload)
    expect(first).toBe(second)
  })

  it("produces different key for different payload", () => {
    const a = stableFeedPlannerIdempotencyKey("feed-create", { feedId: 123, mode: "pro" })
    const b = stableFeedPlannerIdempotencyKey("feed-create", { feedId: 124, mode: "pro" })
    expect(a).not.toBe(b)
  })

  it("produces random keys with prefix", () => {
    const one = randomFeedPlannerIdempotencyKey("feed-queue")
    const two = randomFeedPlannerIdempotencyKey("feed-queue")
    expect(one.startsWith("feed-queue-")).toBe(true)
    expect(two.startsWith("feed-queue-")).toBe(true)
    expect(one).not.toBe(two)
  })
})
