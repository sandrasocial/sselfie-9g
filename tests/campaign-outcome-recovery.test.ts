// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { ALLOWED_ANALYTICS_EVENTS } from "@/lib/analytics/event-contract"
import {
  campaignRecoveryEmail,
  CAMPAIGN_RECOVERY_EMAIL_TYPES,
} from "@/lib/campaign-outcome/recovery-emails"

const read = (path: string) => readFileSync(path, "utf8")

describe("campaign checkout recovery", () => {
  it("uses a held three-touch cadence with hard buyer suppression", () => {
    const route = read("app/api/cron/campaign-checkout-recovery/route.ts")
    expect(route).toContain("INTERVAL '1 hour'")
    expect(route).toContain("INTERVAL '24 hours'")
    expect(route).toContain("INTERVAL '72 hours'")
    expect(route).toContain("FROM stripe_payments sp")
    expect(route).toContain("sp.product_type = 'campaign_outcome'")
    expect(route).toContain("sp.status IN ('succeeded', 'paid')")
    expect(route).toContain("sp.is_test_mode = FALSE")
    expect(route).toContain("CAMPAIGN_CHECKOUT_RECOVERY_DISABLED")
    expect(route).toContain("CAMPAIGN_OUTCOME_DISABLED")
    expect(route).toContain("checkout.sessions.retrieve")
  })

  it("gates each follow-up on the prior stage and registers one analytics event", () => {
    const route = read("app/api/cron/campaign-checkout-recovery/route.ts")
    expect(route).toContain("prior.email_type")
    expect(route).toContain("prior.status IN ('sent', 'delivered')")
    expect(route).toContain('eventName: "campaign_checkout_recovery_sent"')
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("campaign_checkout_recovery_sent")
    expect(CAMPAIGN_RECOVERY_EMAIL_TYPES).toEqual({
      oneHour: "campaign-checkout-recovery-1",
      dayOne: "campaign-checkout-recovery-2",
      dayThree: "campaign-checkout-recovery-3",
    })
  })

  it("keeps the validation cohort at the same full price without fake urgency", () => {
    for (const stage of [1, 2, 3] as const) {
      const email = campaignRecoveryEmail({
        firstName: "Maya",
        email: "maya@example.com",
        stage,
      })
      expect(email.text).toContain("https://sselfie.ai/checkout/campaign")
      expect(email.text).not.toMatch(/discount|coupon|expires|last chance/i)
    }
    expect(
      campaignRecoveryEmail({ firstName: "Maya", email: "maya@example.com", stage: 1 }).text
    ).toContain("$97")
  })

  it("runs on the existing hourly operating rhythm without touching the live event", () => {
    const config = JSON.parse(read("vercel.json"))
    expect(config.crons).toContainEqual({
      path: "/api/cron/campaign-checkout-recovery",
      schedule: "10 * * * *",
    })
    expect(read("app/api/cron/campaign-checkout-recovery/route.ts")).not.toContain(
      "one_selfie_visibility_bundle"
    )
  })
})
