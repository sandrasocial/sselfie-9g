import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function expectBudgetedCron(route: string) {
  for (const required of ["runWithRuntimeBudget", "logWithinRuntimeBudget", "signal,", "idempotencyKey:"]) {
    expect(route).toContain(required)
  }
  for (const directLog of [
    "await cronLogger.start()",
    "await cronLogger.success(",
    "await cronLogger.error(",
  ]) {
    expect(route).not.toContain(directLog)
  }
}

describe("email cron runtime budgets", () => {
  it("keeps the AI photoshoot nurture batch inside its Vercel runtime", () => {
    const route = readFileSync("app/api/cron/ai-photoshoot-nurture/route.ts", "utf8")

    expect(route).toContain("const RUNTIME_BUDGET_MS = 240_000")
    expect(route).toContain("const MAX_TOTAL_PER_RUN_DEFAULT = 50")
    expect(route).toContain("const MAX_PER_TOUCH_DEFAULT = 12")
    expectBudgetedCron(route)
    expect(route).toContain("fairTouchLimit")
    expect(route).toContain("remainingSends: remainingSends - result.processed")
    expect(route).toContain("remainingSends = next.remainingSends")
    expect(route).toContain("if (providerAccepted) {")
    expect(route.indexOf("result.processed += 1")).toBeLessThan(
      route.indexOf("operation: () => sleep(sendDelayMs)")
    )
    const sendEmail = readFileSync("lib/email/send-email.ts", "utf8")
    expect(sendEmail).toContain("onAccepted?: (messageId?: string) => void")
    expect(sendEmail.indexOf("options.onAccepted?.(result.messageId)")).toBeLessThan(
      sendEmail.indexOf("await logEmailSend(\n      recipient,\n      emailType,\n      \"sent\"")
    )
  })

  it("bounds subscriber win-back work, including logging, and prioritizes mature stages", () => {
    const route = readFileSync("app/api/cron/subscriber-winback/route.ts", "utf8")

    expectBudgetedCron(route)
    expect(route).toContain("const RUNTIME_BUDGET_MS = 42_000")
    expect(route).toContain("const MAX_EMAILS_PER_RUN = 8")
    expect(route).toContain("const BATCH_LIMIT = 2")
    expect(route).toContain("const SUNSET_LIMIT = 10")
    expect(route.indexOf("results.sunset = await runSunset")).toBeLessThan(
      route.indexOf("for (const stage of [...STAGES].reverse())")
    )
    expect(route).toContain("for (const stage of [...STAGES].reverse())")
    expect(route).toContain("processWithRuntimeBudget")
    expect(route).toContain("operation: () => getStageCandidates(stage, limit)")
    expect(route).toContain("runtimeBudget.canStart(MIN_SEND_BUDGET_MS)")
    expect(route).toContain("ASC NULLS FIRST")
    expect(route).toContain("failed.status IN ('failed', 'error')")
    expect(route).toContain("remainingSends")
    expect(route).toContain('searchParams.get("dry_run") === "1"')
    expect(route).toContain("if (dryRun) return results")
  })
})
