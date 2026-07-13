// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import {
  generateOneSelfieBundleCheckoutRecoveryEmail,
  ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_EMAIL_TYPE,
} from "@/lib/email/templates/one-selfie-bundle-checkout-recovery"
import { buildOneSelfieCheckoutHref } from "@/components/one-selfie/attribution"

const ROOT = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("One Selfie Bundle abandoned-checkout recovery", () => {
  it("returns to the event page with one attributed, prefilled CTA", () => {
    const email = generateOneSelfieBundleCheckoutRecoveryEmail({
      firstName: "Sandra",
      recipientEmail: "Sandra@Example.com",
    })
    const links = [...email.html.matchAll(/<a href="([^"]+)"/g)].map((match) => match[1])

    expect(email.subject).toBe("still thinking about the One Selfie Bundle?")
    expect(links).toHaveLength(1)

    const checkoutUrl = new URL(links[0].replaceAll("&amp;", "&"))
    expect(checkoutUrl.pathname).toBe("/one-selfie")
    expect(checkoutUrl.searchParams.get("source")).toBe("email")
    expect(checkoutUrl.searchParams.get("utm_source")).toBe("email")
    expect(checkoutUrl.searchParams.get("utm_medium")).toBe("checkout_recovery")
    expect(checkoutUrl.searchParams.get("utm_campaign")).toBe("one_selfie_bundle_recovery")
    expect(checkoutUrl.searchParams.get("utm_content")).toBe("return_to_bundle")
    expect(checkoutUrl.searchParams.get("email_type")).toBe(
      ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_EMAIL_TYPE,
    )
    expect(checkoutUrl.searchParams.get("checkout_email")).toBe("sandra@example.com")

    const checkoutHref = buildOneSelfieCheckoutHref(
      Object.fromEntries(checkoutUrl.searchParams.entries()),
    )
    const bundleCheckoutUrl = new URL(checkoutHref, "https://sselfie.ai")
    expect(bundleCheckoutUrl.pathname).toBe("/checkout/one-selfie")
    expect(bundleCheckoutUrl.searchParams.get("checkout_email")).toBe("sandra@example.com")
  })

  it("states the complete one-time offer without a discount or renewal ambiguity", () => {
    const email = generateOneSelfieBundleCheckoutRecoveryEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
    })

    expect(email.text).toContain("$97 once")
    expect(email.text).toContain("Five tools stay yours for life")
    expect(email.text).toContain("30-day Maya pass ends automatically")
    expect(email.text).toContain("Nothing renews")
    expect(email.text).toContain("Wednesday at 6 PM Oslo time")
    expect(email.text).not.toMatch(/discount|coupon|save \d|% off/i)
  })

  it("uses the existing hourly job for one event-window send after three hours", () => {
    const route = read("app/api/cron/starter-kit-checkout-recovery/route.ts")
    const vercel = read("vercel.json")

    expect(route).toContain("SELFIE_VISIBILITY_BUNDLE_OPENS_AT")
    expect(route).toContain("SELFIE_VISIBILITY_BUNDLE_CLOSES_AT")
    expect(route).toContain("getSelfieVisibilityBundleOfferStatus")
    expect(route).toContain("ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_EMAIL_TYPE")
    expect(route).toContain("generateOneSelfieBundleCheckoutRecoveryEmail")
    expect(route).toContain('envFlag("ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_ENABLED")')
    expect(route).toMatch(
      /const hydration = await hydrateMissingBundleCheckoutEmails\(budget\)[\s\S]*?const candidates = hasRecoveryBudget\(budget\) \? await getBundleRecoveryCandidates\(\) : \[\][\s\S]*?if \(!envFlag\("ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_ENABLED"\)\) \{[\s\S]*?enabled: false,[\s\S]*?sent: 0/,
    )
    expect(route).toContain("product_type = 'selfie_visibility_bundle'")
    expect(route).toContain("created_at <= NOW() - INTERVAL '3 hours'")
    expect(route).toContain("created_at >= ${SELFIE_VISIBILITY_BUNDLE_OPENS_AT}::timestamptz")
    expect(route).toContain("created_at < ${SELFIE_VISIBILITY_BUNDLE_CLOSES_AT}::timestamptz")
    expect(route).toContain("recovery_email_sent_at IS NULL")
    expect(route).toContain("sp.product_type = 'selfie_visibility_bundle'")
    expect(route).toContain("sp.status IN ('succeeded', 'paid')")
    expect(route).toContain("sp.is_test_mode = FALSE")
    expect(route).toContain("sp.checkout_session_id = ca.session_id")
    expect(route).toContain("JOIN subscriptions s ON s.user_id = u.id")
    expect(route).toContain(
      "s.product_type IN ('sselfie_studio_membership', 'sselfie_studio_membership_annual', 'brand_studio_membership', 'pro')",
    )
    expect(route).toContain("s.status = 'active'")
    expect(route).toContain("COALESCE(s.is_test_mode, FALSE) = FALSE")
    expect(route).toContain('checkoutSession.payment_status === "paid"')
    expect(route).toContain('checkoutSession.status === "complete"')
    expect(route).toMatch(
      /if \(!getSelfieVisibilityBundleOfferStatus\(new Date\(\)\)\.isOpen\) \{[\s\S]*?break[\s\S]*?\}\s*const sent = await sendEmail/,
    )
    expect(route).toContain('emailType: ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_EMAIL_TYPE')
    expect(route).toContain('tags: ["one-selfie-bundle", "checkout-recovery"]')

    expect(vercel.match(/\/api\/cron\/starter-kit-checkout-recovery/g)).toHaveLength(1)
    expect(vercel).not.toContain("one-selfie-bundle-checkout-recovery")
  })

  it("does not add a second bundle follow-up and leaves Starter Kit follow-ups intact", () => {
    const route = read("app/api/cron/starter-kit-checkout-recovery/route.ts")

    expect(route).toContain("STARTER_KIT_CHECKOUT_RECOVERY_2_EMAIL_TYPE")
    expect(route).toContain("FOLLOWUP_STAGES")
    expect(route).not.toContain("ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_2")
    expect(route).not.toContain("ONE_SELFIE_BUNDLE_FOLLOWUP")
  })

  it("keeps every recovery lane inside one shared 60-second cron budget", () => {
    const route = read("app/api/cron/starter-kit-checkout-recovery/route.ts")

    expect(route).toContain("const BUNDLE_RECOVERY_BATCH_LIMIT = 4")
    expect(route.match(/LIMIT \$\{BUNDLE_RECOVERY_BATCH_LIMIT\}/g)).toHaveLength(2)
    expect(route).toContain("const RECOVERY_WORK_BUDGET_MS = 38_000")
    expect(route).toContain("const RECOVERY_OPERATION_LIMIT = 16")
    expect(route).toContain("const workBudget = createRecoveryWorkBudget()")
    expect(route).toContain("claimRecoveryOperation(budget)")
    expect(route).toContain("claimRecoveryOperation(workBudget)")
    expect(route).toContain("paceWithinRecoveryBudget")
    expect(route).toContain("sendBundleCheckoutRecovery(workBudget)")
    expect(route).toContain("hydrateMissingCheckoutEmails(workBudget)")
    expect(route).toContain("sendFollowupStage(stage, workBudget)")

    const maximumSharedSleepMs = 16 * 650
    expect(maximumSharedSleepMs).toBeLessThan(12_000)
    expect(38_000 + maximumSharedSleepMs).toBeLessThan(60_000)
  })
})
