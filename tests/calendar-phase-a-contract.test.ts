import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Calendar Phase A operational contracts", () => {
  it("keeps bulk image work inside the supported function window", () => {
    const route = read("app/api/feed-planner/queue-all-images/route.ts")
    expect(route).toContain("export const maxDuration = 300")
  })

  it("charges bulk posts only after a prediction is stored, and recovers only abandoned claims", () => {
    const queue = read("lib/feed-planner/queue-images.ts")
    // Atomic per-post claim.
    expect(queue).toContain("RETURNING id")
    // Money invariant: the charge is keyed to the STORED prediction id in both provider
    // paths (charge-after-store), never before the provider call. This is what prevents
    // taking a member's credits for an image that was never created.
    expect(queue).toContain("await deductCredits(")
    expect(queue).toContain("generation.predictionId,")
    expect(queue).toContain("prediction.id,")
    // Charge-after-store needs no refund path, and must not re-introduce a pre-charge.
    expect(queue).not.toContain("refundCredits")
    // Stuck-recovery resets only abandoned claims (no stored prediction) so a charged,
    // in-flight prediction is never orphaned and double-charged on retry.
    expect(queue).toContain("AND prediction_id IS NULL")
    expect(queue).toContain("updated_at < NOW() - INTERVAL '10 minutes'")
    // The old lump-sum end-of-loop deduction must not return.
    expect(queue).not.toContain("Deduct credits once for all successful generations")
  })

  it("never sends an in-app calendar action to the retired Studio route", () => {
    const files = [
      "components/feed-planner/feed-post-card.tsx",
      "components/feed-planner/feed-view-screen.tsx",
      "components/feed-planner/hooks/use-feed-actions.ts",
      "app/feed-planner/feed-planner-client.tsx",
    ]
    for (const file of files) expect(read(file)).not.toContain("/studio#maya/feed")
  })

  it("selects this month's eligible calendar owners deterministically", () => {
    const cron = read("app/api/cron/feed-plan-monthly-draft/route.ts")
    expect(cron).not.toContain("previousPeriodMonth")
    expect(cron).toContain("ORDER BY u.id")
    expect(cron).toContain("paid_blueprint_purchased = TRUE")
    expect(cron).toContain("product_type IN")
  })

  it("cleans up calendar animation and recovery timers", () => {
    const confetti = read("components/feed-planner/hooks/use-feed-confetti.ts")
    const polling = read("components/feed-planner/hooks/use-feed-polling.ts")
    expect(confetti).toContain("timeoutIds.forEach")
    expect(confetti).toContain("particles.forEach")
    expect(polling).toContain("recoveryTimeouts.forEach")
  })

  it("keeps delivered-month pre-generation free while normal regeneration still charges", () => {
    const queue = read("lib/feed-planner/queue-images.ts")
    const deliveredMonth = read("lib/feed-planner/delivered-month.ts")

    expect(queue).toContain("chargeCredits?: boolean")
    expect(queue).toContain("if (chargeCredits)")
    expect(queue).toContain("pregenerated_at = NOW()")
    expect(queue).toContain("Keep the established manual path independent of the dark-release migration")
    expect(deliveredMonth).toContain("chargeCredits: false")
    expect(deliveredMonth).toContain("markPregenerated: true")
    expect(deliveredMonth).toContain("forceProMode: true")
    expect(deliveredMonth).toContain("useCuratedFeedStylePrompts: true")
    expect(queue).toContain("selectPromptForPosition")
  })

  it("ships the delivered month dark and caps automatic spend", () => {
    const deliveredMonth = read("lib/feed-planner/delivered-month.ts")
    const cron = read("app/api/cron/feed-plan-monthly-draft/route.ts")

    expect(deliveredMonth).toContain('process.env.CALENDAR_DELIVERED_MONTH_ENABLED === "true"')
    expect(deliveredMonth).toContain("CALENDAR_PREGEN_WEEKLY_CAP")
    expect(deliveredMonth).toContain("DEFAULT_WEEKLY_CAP = 10")
    expect(cron).toContain("runDeliveredMonthTopUp")
  })

  it("limits unattended work to current person slots with real identity references", () => {
    const deliveredMonth = read("lib/feed-planner/delivered-month.ts")
    const migration = read("scripts/2026-07-15-calendar-delivered-month.sql")

    expect(deliveredMonth).toContain("fl.period_month = ${periodMonth}")
    expect(deliveredMonth).toContain("pending.post_type = 'selfie'")
    expect(deliveredMonth).toContain("pending.scheduled_at::date < CURRENT_DATE + 7")
    expect(deliveredMonth).toContain("uai.image_type IN ('selfie', 'side-profile', 'three-quarter', 'full-body')")
    expect(deliveredMonth).toContain("selfie_visibility_bundle_pass")
    expect(deliveredMonth).not.toContain("one_time_session")
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS pregenerated BOOLEAN")
  })

  it("keeps the compact Today outcome available only through the dark endpoint", () => {
    const endpoint = read("app/api/feed-planner/today/route.ts")
    const strip = read("components/app-v3/calendar-today-strip.tsx")
    const view = read("components/app-v3/feed-planner-view.tsx")

    expect(endpoint).toContain("if (!deliveredMonthEnabled())")
    expect(endpoint).toContain("hasDeliveredMonthAccess")
    expect(strip).toContain('"Download"')
    expect(strip).toContain('"Copy caption"')
    expect(strip).toContain('"Mark as posted"')
    expect(view).toContain("<CalendarTodayStrip />")
  })

  it("records the real calendar outcome after an owned post is marked posted", () => {
    const route = read("app/api/feed/[feedId]/mark-posted/route.ts")
    const contract = read("lib/analytics/event-contract.ts")

    expect(route).toContain('eventName: "calendar_post_published"')
    expect(contract).toContain('"calendar_post_published"')
  })
})
