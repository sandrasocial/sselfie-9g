import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Calendar Phase A operational contracts", () => {
  it("keeps bulk image work inside the supported function window", () => {
    const route = read("app/api/feed-planner/queue-all-images/route.ts")
    expect(route).toContain("export const maxDuration = 300")
  })

  it("reserves bulk-post credits before provider work and refunds failed delivery", () => {
    const queue = read("lib/feed-planner/queue-images.ts")
    // Atomic per-post claim.
    expect(queue).toContain("RETURNING id")
    // Money invariant: credits are atomically reserved before the paid provider call.
    // A failed delivery returns that reservation.
    expect(queue).toContain("Reserve credits before any paid provider call")
    expect(queue).toContain("await deductCredits(")
    expect(queue).toContain("await refundCredits(")
    expect(queue).not.toContain("generated but credit charge failed (delivery not blocked)")
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
    expect(queue).toContain(
      "Keep the established manual path independent of the dark-release migration"
    )
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
    expect(deliveredMonth).toContain("CALENDAR_DELIVERED_MONTH_ADMIN_ONLY")
    expect(deliveredMonth).toContain("DEFAULT_WEEKLY_CAP = 10")
    expect(cron).toContain("runDeliveredMonthTopUp")
    expect(cron).toContain("adminOnlyPreview")
    expect(cron).toContain("OR u.role = 'admin'")
  })

  it("limits unattended work to current person slots with real identity references", () => {
    const deliveredMonth = read("lib/feed-planner/delivered-month.ts")
    const migration = read("scripts/2026-07-15-calendar-delivered-month.sql")

    expect(deliveredMonth).toContain("fl.period_month = ${periodMonth}")
    expect(deliveredMonth).toContain("pending.post_type = 'selfie'")
    expect(deliveredMonth).toContain("pending.scheduled_at::date < CURRENT_DATE + 7")
    expect(deliveredMonth).toContain(
      "uai.image_type IN ('selfie', 'side-profile', 'three-quarter', 'full-body')"
    )
    expect(deliveredMonth).toContain("selfie_visibility_bundle_pass")
    expect(deliveredMonth).not.toContain("one_time_session")
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS pregenerated BOOLEAN")
  })

  it("keeps the compact Today outcome available through its gated endpoint, not as the Calendar front door", () => {
    const endpoint = read("app/api/feed-planner/today/route.ts")
    const strip = read("components/app-v3/calendar-today-strip.tsx")
    const view = read("components/app-v3/feed-planner-view.tsx")

    expect(endpoint).toContain("if (!deliveredMonthEnabled())")
    expect(endpoint).toContain("hasDeliveredMonthAccess")
    expect(strip).toContain('"Download"')
    expect(strip).toContain('"Copy caption"')
    expect(strip).toContain('"Mark as posted"')
    expect(view).not.toContain("<CalendarTodayStrip />")
    expect(view).toContain("The Instagram canvas is the Calendar front door")
  })

  it("records the real calendar outcome after an owned post is marked posted", () => {
    const route = read("app/api/feed/[feedId]/mark-posted/route.ts")
    const contract = read("lib/analytics/event-contract.ts")

    expect(route).toContain('eventName: "calendar_post_published"')
    expect(contract).toContain('"calendar_post_published"')
  })

  it("hydrates the embedded Calendar before restoring its saved grid", () => {
    const view = read("components/app-v3/feed-planner-view.tsx")

    expect(view).toContain("useState<number | null>(null)")
    expect(view).toContain("window.localStorage.getItem(SELECTED_FEED_KEY)")
    expect(view).not.toContain(
      'useState<number | null>(() => {\n    if (typeof window === "undefined")'
    )
  })
})
