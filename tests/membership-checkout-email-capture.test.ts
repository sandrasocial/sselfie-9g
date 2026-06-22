// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import {
  buildCheckoutEmailCaptureHiddenParams,
  buildSkipCheckoutEmailCaptureHref,
} from "@/lib/revenue-engine/anonymous-checkout-capture"
import { ALLOWED_ANALYTICS_EVENTS } from "@/lib/analytics/event-contract"

const ROOT = process.cwd()

describe("membership checkout email capture", () => {
  it("preserves membership checkout params through the email-first step", () => {
    const hidden = buildCheckoutEmailCaptureHiddenParams({
      interval: "year",
      plan: "founding",
      promo: "FOUNDING",
      bonus: "4credits",
      source: "trial_day5",
      utm_source: "email",
    })

    expect(hidden).toEqual(
      expect.arrayContaining([
        { name: "interval", value: "year" },
        { name: "plan", value: "founding" },
        { name: "promo", value: "FOUNDING" },
        { name: "bonus", value: "4credits" },
        { name: "source", value: "trial_day5" },
        { name: "utm_source", value: "email" },
      ]),
    )

    const skipHref = buildSkipCheckoutEmailCaptureHref("/checkout/membership", {
      interval: "month",
      bonus: "4credits",
    })

    expect(skipHref).toContain("/checkout/membership?")
    expect(skipHref).toContain("interval=month")
    expect(skipHref).toContain("bonus=4credits")
    expect(skipHref).toContain("skip_email_capture=1")
  })

  it("allows the membership checkout capture analytics event", () => {
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("membership_checkout_email_capture_view")
  })

  it("uses the approved membership capture copy", () => {
    const membershipPage = fs.readFileSync(path.join(ROOT, "app/checkout/membership/page.tsx"), "utf8")

    expect(membershipPage).toContain("Where should I send your access?")
    expect(membershipPage).toContain("Continue to secure payment")
    expect(membershipPage).toContain("Skip and go straight to payment")
    expect(membershipPage).toContain("SSELFIE SUITE")
    expect(membershipPage).toContain("97 EUR / month")
    expect(membershipPage).toContain("/images/email/studio-visual-workspace.jpg")
  })
})
