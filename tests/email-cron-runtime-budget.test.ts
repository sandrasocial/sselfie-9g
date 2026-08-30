import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("email cron runtime budgets", () => {
  it("keeps the AI photoshoot nurture batch inside its Vercel runtime", () => {
    const route = readFileSync("app/api/cron/ai-photoshoot-nurture/route.ts", "utf8")

    expect(route).toContain("const MAX_TOTAL_PER_RUN_DEFAULT = 100")
    expect(route).toContain("idempotencyKey:")
  })

  it("bounds subscriber win-back work and prioritizes mature stages", () => {
    const route = readFileSync("app/api/cron/subscriber-winback/route.ts", "utf8")

    expect(route).toContain("const RUNTIME_BUDGET_MS = 42_000")
    expect(route).toContain("const MAX_EMAILS_PER_RUN = 8")
    expect(route).toContain("const BATCH_LIMIT = 2")
    expect(route).toContain("const SUNSET_LIMIT = 10")
    expect(route.indexOf("results.sunset = await runSunset")).toBeLessThan(
      route.indexOf("for (const stage of [...STAGES].reverse())"),
    )
    expect(route).toContain("for (const stage of [...STAGES].reverse())")
    expect(route).toContain("processWithRuntimeBudget")
    expect(route).toContain("runtimeBudget.canStart(MIN_SEND_BUDGET_MS)")
    expect(route).toContain("ASC NULLS FIRST")
    expect(route).toContain("failed.status IN ('failed', 'error')")
    expect(route).toContain("remainingSends")
    expect(route).toContain("idempotencyKey:")
    expect(route).toContain('searchParams.get("dry_run") === "1"')
    expect(route).toContain("if (dryRun) return results")
  })
})
