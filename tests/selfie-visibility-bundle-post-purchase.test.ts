// @vitest-environment node

import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("One Selfie Visibility Bundle post-purchase path", () => {
  it("creates public buyers, suppresses generic email, and delegates once to the bundle handler", () => {
    const dispatcher = read("lib/payments/lifecycle/checkout-session-completed.ts")

    expect(dispatcher).toContain("handleSelfieVisibilityBundleCheckout")
    expect(dispatcher).toContain("ensureExistingNeonPublicCheckoutAuth")
    expect(dispatcher).toContain("SELECT id, supabase_user_id, password_setup_complete")
    expect(dispatcher).toContain('source === "one_selfie_launch"')
    expect(dispatcher).toMatch(
      /const isPublicPaidCheckoutSource =[\s\S]*?source === "one_selfie_launch" \|\|\s*productType === "selfie_visibility_bundle"/,
    )
    expect(dispatcher).toContain('productType !== "selfie_visibility_bundle"')
    expect(dispatcher).toContain('"/academy/access/one-selfie"')
    expect(dispatcher).toContain('pendingWelcomeProduct !== "selfie_visibility_bundle"')
    expect(dispatcher.match(/await handleSelfieVisibilityBundleCheckout\(\{/g)).toHaveLength(1)
  })

  it("shows an accurate one-time order and sends the buyer to her dedicated home", () => {
    const success = read("components/checkout/success-content.tsx")

    expect(success).toContain('case "selfie_visibility_bundle"')
    expect(success).toContain('return "One Selfie Visibility Bundle"')
    expect(success).toContain('productType === "selfie_visibility_bundle"')
    expect(success).toContain('href: "/academy/access/one-selfie"')
    expect(success).toContain('label: "Open your bundle"')
    expect(success).toContain("SELFIE_VISIBILITY_BUNDLE_INCLUDES")
    expect(success).toContain("30 days of SUITE · 200 credits · no renewal")
    expect(success).toContain("selfie_visibility_bundle: 97")
    expect(success).toContain("session_id: sessionId")
    expect(success).toMatch(
      /"sselfie_studio_membership",\s*"sselfie_studio_membership_annual",\s*"visibility_suite"/,
    )
  })

  it("recovers safely when another checkout creates the same auth user first", () => {
    const dispatcher = read("lib/payments/lifecycle/checkout-session-completed.ts")

    expect(dispatcher).toContain("const recoveredUser = await findAuthUserByEmail")
    expect(dispatcher).toContain("if (!recoveredUser) {")
    expect(dispatcher).toContain("authUserId = recoveredUser.id")
    expect(dispatcher).toContain("account_setup_checkout_session_id: session.id")
  })

  it("guards one simple buyer home by the marker entitlement and links fulfilled records", () => {
    expect(existsSync("app/academy/access/one-selfie/page.tsx")).toBe(true)
    expect(existsSync("components/one-selfie/buyer-home-link.tsx")).toBe(true)

    const buyerHome = read("app/academy/access/one-selfie/page.tsx")
    const trackedLink = read("components/one-selfie/buyer-home-link.tsx")

    expect(buyerHome).toContain("requireAcademyPageUser")
    expect(buyerHome).toContain('explicitProductIds.includes("selfie_visibility_bundle")')
    expect(buyerHome).toContain("/access/starter-kit/")
    expect(buyerHome).toContain("/access/prompt-vault/")
    expect(buyerHome).toContain("/access/presets/")
    expect(buyerHome).toContain("branded_by_sselfie")
    expect(buyerHome).toContain("editing_masterclass")
    expect(buyerHome).toContain("`/academy/courses/${course.id}`")
    expect(buyerHome).not.toContain("/studio?tab=academy")
    expect(buyerHome).toContain('href="/app?tab=create"')
    expect(buyerHome).toContain("STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID")
    expect(buyerHome).toContain("one_selfie_bundle_upsell")
    expect(trackedLink).toContain("selfie_visibility_bundle_asset_opened")
    expect(trackedLink).toContain("selfie_visibility_bundle_annual_upsell_clicked")
  })

  it("keeps bundle and annual-upsell behavior in the analytics allowlist", () => {
    const contract = read("lib/analytics/event-contract.ts")

    for (const event of [
      "selfie_visibility_bundle_checkout_completed",
      "selfie_visibility_bundle_access_opened",
      "selfie_visibility_bundle_asset_opened",
      "selfie_visibility_bundle_annual_upsell_viewed",
      "selfie_visibility_bundle_annual_upsell_clicked",
      "selfie_visibility_bundle_annual_upsell_completed",
    ]) {
      expect(contract).toContain(`"${event}"`)
    }
  })
})
