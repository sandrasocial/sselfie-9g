// @vitest-environment node

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ sql: vi.fn() }))

import { buildOneSelfieCampaignScorecard } from "@/lib/admin/one-selfie-campaign-scorecard"

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("One Selfie campaign scorecard", () => {
  it("builds the fixed-window founder flow without treating behavior as revenue", () => {
    const report = buildOneSelfieCampaignScorecard({
      now: new Date("2026-07-14T10:00:00.000Z"),
      trafficRows: [
        { source: "instagram", medium: "manychat", views: "30", cta_clicks: "9" },
        { source: "email", medium: "launch", views: "20", cta_clicks: "6" },
      ],
      checkoutRow: { starts: "10" },
      paymentRow: {
        paid_payments: "4",
        paid_buyers: "4",
        gross_cents: "38800",
      },
      activationRow: {
        buyer_home_opened: "3",
        maya_opened: "2",
        generated: "2",
        downloaded: "1",
      },
    })

    expect(report.phase).toBe("open")
    expect(report.traffic).toEqual({
      views: 50,
      ctaClicks: 15,
      bySource: [
        { source: "instagram", medium: "manychat", views: 30, ctaClicks: 9 },
        { source: "email", medium: "launch", views: 20, ctaClicks: 6 },
      ],
    })
    expect(report.checkout).toMatchObject({
      starts: 10,
      paidPayments: 4,
      paidBuyers: 4,
      grossUsd: 388,
      pageToCheckoutPct: 20,
      checkoutToPaidPct: 40,
    })
    expect(report.activation).toEqual({
      buyerHomeOpened: 3,
      mayaOpened: 2,
      generated: 2,
      downloaded: 1,
    })
    expect(report.sources).toEqual({
      traffic: "analytics_events",
      checkout: "checkout_attribution",
      money: "stripe_payments",
      activation: "analytics_events + stripe_payments",
    })
  })

  it("uses zero-safe conversion rates", () => {
    const report = buildOneSelfieCampaignScorecard({
      now: new Date("2026-07-13T12:00:00.000Z"),
      trafficRows: [],
      checkoutRow: {},
      paymentRow: {},
      activationRow: {},
    })

    expect(report.phase).toBe("upcoming")
    expect(report.checkout.pageToCheckoutPct).toBe(0)
    expect(report.checkout.checkoutToPaidPct).toBe(0)
  })

  it("keeps the fixed campaign filters and Admin Data Contract explicit", () => {
    const scorecard = read("lib/admin/one-selfie-campaign-scorecard.ts")
    const homeReport = read("lib/admin/home-report.ts")
    const adminPage = read("app/admin/page.tsx")

    expect(scorecard).toContain("SELFIE_VISIBILITY_BUNDLE_OPENS_AT")
    expect(scorecard).toContain("SELFIE_VISIBILITY_BUNDLE_CLOSES_AT")
    expect(scorecard).toContain("properties->>'offer_slug' = 'one-selfie-visibility-bundle'")
    expect(scorecard).toContain("product_type = 'selfie_visibility_bundle'")
    expect(scorecard).toContain("status IN ('succeeded', 'paid')")
    expect(scorecard).toContain("COALESCE(sp.is_test_mode, FALSE) = FALSE")
    expect(scorecard).toContain("sp.checkout_session_id")
    expect(scorecard).toContain("selfie_visibility_bundle_access_opened")
    expect(scorecard).toContain("suite_maya_inline_started")
    expect(scorecard).not.toContain("ae.event_name = 'suite_home_viewed'")
    expect(scorecard).toContain("suite_image_generated")
    expect(scorecard).toContain("suite_image_downloaded")

    expect(homeReport).toContain("getOneSelfieCampaignScorecard")
    expect(homeReport).toContain("oneSelfieCampaign")
    expect(adminPage).toContain("One Selfie · July 13–15")
    expect(adminPage).toContain("Funnels, last 30 days")
    expect(adminPage).toContain("Buyer home")
    expect(adminPage).toContain("Maya opened")
  })
})
