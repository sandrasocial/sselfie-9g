// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("remaining funnel leak regression", () => {
  it("keeps core funnel leak fixes in place", () => {
    const sequenceContents = read("lib/email/selfie-guide-email-sequence.ts")
    const appContents = read("components/sselfie/sselfie-app.tsx")
    const sitemapContents = read("app/sitemap.ts")

    expect(sequenceContents).toContain('"nurture-strategy-n1"')
    expect(sequenceContents).toContain('"nurture-strategy-n5"')
    expect(sequenceContents).not.toContain("nurture-freebie-n")

    expect(appContents).toContain('what_to_say: "academy"')
    expect(appContents).toContain('show_up: "academy"')
    expect(appContents).toContain('get_paid: "academy"')

    expect(sitemapContents).toContain('"/brand-strategy"')
    expect(sitemapContents).toContain('"/why-studio"')
  })

  it("uses a session-aware brand strategy setup handoff after checkout", () => {
    const checkoutContents = read("app/checkout/page.tsx")
    const successContents = read("components/checkout/success-content.tsx")
    const guideAccessContents = read("app/selfie-guide/access/[token]/page.tsx")
    const guideExperienceContents = read("components/freebie/selfie-guide-experience.tsx")

    expect(checkoutContents).toContain("has_brand_strategy_pack")
    expect(checkoutContents).toContain("brand_strategy_bump=1")

    expect(successContents).toContain("/api/brand-strategy/setup-token?session_id=")
    expect(successContents).toContain("/brand-strategy/setup/")
    expect(successContents).toContain("brandStrategyBumpSelected")
    expect(successContents).not.toContain('label: "Check your email"')

    expect(guideAccessContents).toContain("checkout_session?: string")
    expect(guideAccessContents).toContain("brand_strategy_bump?: string")

    expect(guideExperienceContents).toContain("brandStrategyBumpSelected")
    expect(guideExperienceContents).toContain("Preparing your Brand Strategy")
    expect(guideExperienceContents).toContain("/api/brand-strategy/setup-token?session_id=")
  })

  it("keeps credits as an authenticated in-app top-up only", () => {
    const creditsPageContents = read("app/checkout/credits/page.tsx")
    const creditsClientContents = read("app/checkout/credits/client.tsx")

    expect(creditsPageContents).toContain('redirect("/auth/login?returnTo=%2Fcheckout%2Fcredits")')
    expect(creditsClientContents).not.toContain("No subscription required")
    expect(creditsClientContents).toContain("extra generations")
  })

  it("removes the paid blueprint email-capture detour before checkout", () => {
    const blueprintContents = read("components/paid-blueprint/paid-blueprint-landing.tsx")

    expect(blueprintContents).toContain('href="/checkout/blueprint"')
    expect(blueprintContents).not.toContain("BlueprintEmailCapture")
    expect(blueprintContents).not.toContain("showEmailModal")
    expect(blueprintContents).not.toContain("router.push(`/checkout/blueprint?email=")
  })

  it("routes membership and one-time checkout failures to a checkout-specific retry page", () => {
    const membershipContents = read("app/checkout/membership/page.tsx")
    const oneTimeContents = read("app/checkout/one-time/page.tsx")
    const failurePageContents = read("app/checkout/failure/page.tsx")

    // Failure route uses dynamic product id (monthly or annual)
    expect(membershipContents).toContain('/checkout/failure?product=')
    expect(membershipContents).toContain('"sselfie_studio_membership"')
    expect(membershipContents).not.toContain("/auth/sign-up?checkout=studio_membership")

    expect(oneTimeContents).toContain('/checkout/failure?product=one_time_session')
    expect(oneTimeContents).not.toContain("/auth/sign-up?checkout=one_time")

    expect(failurePageContents).toContain("Try checkout again")
    expect(failurePageContents).toContain("/private-shoot")
  })

  it("keeps brand strategy attribution sources aligned to the actual path", () => {
    const checkoutContents = read("app/checkout/brand-strategy-pack/page.tsx")
    const webhookContents = read("app/api/webhooks/stripe/route.ts")

    expect(checkoutContents).toContain('"brand_strategy_paid"')
    expect(checkoutContents).toContain('"strategy_result_upsell"')
    expect(checkoutContents).not.toContain('"freebie_upsell"')

    expect(webhookContents).toContain("selfie_guide_order_bump")
  })
})
