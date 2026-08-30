import { describe, expect, it } from "vitest"

import { createRuntimeBudget, processWithRuntimeBudget } from "@/lib/cron/runtime-budget"

describe("cron runtime budget", () => {
  it("stops before starting work that cannot fit in the remaining budget", async () => {
    let now = 0
    const processed: number[] = []
    const budget = createRuntimeBudget(42_000, () => now)

    const result = await processWithRuntimeBudget({
      items: [1, 2, 3, 4, 5],
      budget,
      minimumRemainingMs: 8_000,
      process: async item => {
        processed.push(item)
        now += 12_000
      },
    })

    expect(result).toEqual({ processed: 3, stoppedForBudget: true })
    expect(processed).toEqual([1, 2, 3])
    expect(budget.elapsedMs()).toBe(36_000)
    expect(budget.remainingMs()).toBe(6_000)
  })

  it("leaves unprocessed work untouched for a later invocation", async () => {
    let now = 0
    const pending = ["mature", "middle", "new"]
    const budget = createRuntimeBudget(20_000, () => now)

    const result = await processWithRuntimeBudget({
      items: pending,
      budget,
      minimumRemainingMs: 7_000,
      process: async () => {
        now += 8_000
      },
    })

    expect(result.processed).toBe(2)
    expect(result.stoppedForBudget).toBe(true)
    expect(pending.slice(result.processed)).toEqual(["new"])
  })
})
