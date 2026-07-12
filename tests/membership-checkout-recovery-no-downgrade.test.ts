// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import { generateMembershipCheckoutRecoveryEmail } from "@/lib/email/templates/membership-checkout-recovery"
import { shouldShowCheckoutEmailCapture } from "@/lib/revenue-engine/anonymous-checkout-capture"
import { buildRevenueEmailLink } from "@/lib/email/templates/revenue-links"

const ROOT = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("membership checkout recovery stays on the paid path", () => {
  it("sends Sandra's approved return-to-checkout email verbatim", () => {
    const checkoutUrl = "https://www.sselfie.ai/checkout/membership?checkout_email=sandra%40example.com"
    const email = generateMembershipCheckoutRecoveryEmail({
      firstName: "Sandra",
      checkoutUrl,
    })

    expect(email.subject).toBe("Still thinking about it?")
    expect(email.text).toBe(`Hi Sandra,

You were one click from joining SSELFIE SUITE. If something held you back, that's okay. €97 is a real decision, not a small one.

Finish joining:
${checkoutUrl}

If you want to talk it through first, just reply to this email. I read every one.

Sandra x`)
    expect(email.html).toContain("Finish joining")
    expect(email.html).toContain(checkoutUrl.replaceAll("&", "&amp;"))
    expect(email.text).not.toMatch(/trial|claim your 7 days/i)
  })

  it("builds a prefilled membership checkout link that bypasses redundant email capture", () => {
    const checkoutUrl = new URL(
      buildRevenueEmailLink("/checkout/membership?interval=month", {
        checkoutEmail: "Sandra@example.com",
        source: "membership_recovery",
        medium: "email",
        campaign: "membership_recovery",
      }),
    )
    const params = Object.fromEntries(checkoutUrl.searchParams.entries())

    expect(checkoutUrl.pathname).toBe("/checkout/membership")
    expect(checkoutUrl.searchParams.get("checkout_email")).toBe("sandra@example.com")
    expect(checkoutUrl.searchParams.get("source")).toBe("membership_recovery")
    expect(checkoutUrl.searchParams.get("utm_source")).toBe("email")
    expect(checkoutUrl.searchParams.get("utm_medium")).toBe("email")
    expect(checkoutUrl.searchParams.get("utm_campaign")).toBe("membership_recovery")
    expect(
      shouldShowCheckoutEmailCapture({
        params,
        hasRecoverableEmail: Boolean(checkoutUrl.searchParams.get("checkout_email")),
        hasAuthUser: false,
        hasFreebieToken: false,
      }),
    ).toBe(false)
  })

  it("never mints a trial claim and only excludes active paying members", () => {
    const route = read("app/api/cron/membership-checkout-recovery/route.ts")

    expect(route).not.toContain("ensureClaimToken")
    expect(route).not.toContain("generateTrialUnlockEmail")
    expect(route).not.toContain("freebie_subscribers")
    expect(route).not.toContain("/claim/")
    expect(route).toContain("buildRevenueEmailLink")
    expect(route).toContain("checkoutEmail: candidate.user_email")
    expect(route).toContain('source: "membership_recovery"')
    expect(route).toContain('campaign: "membership_recovery"')
    expect(route).toContain("s.product_type = 'sselfie_studio_membership' AND s.status = 'active'")
    expect(route).not.toContain("OR s.product_type = 'suite_trial'")
    expect(route).not.toContain("'suite_trial_unlock'")

    // Unrelated safety and delivery behavior stays pinned.
    expect(route).toContain("MEMBERSHIP_CHECKOUT_RECOVERY_DISABLED")
    expect(route).toContain("recovery_email_sent_at IS NULL")
    expect(route).toContain("hydrateMembershipEmails")
  })
})
