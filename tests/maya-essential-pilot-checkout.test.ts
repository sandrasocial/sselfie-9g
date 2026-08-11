import { afterEach, describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

import {
  MAYA_ESSENTIAL_PILOT_PLAN,
  MAYA_PRO_PILOT_PLAN,
  assertMayaTierPilotCheckoutAllowed,
  creditGrantProductForMayaPlan,
  isMayaEssentialPlan,
} from "@/lib/business/maya-tier-pilot"
import {
  getSubscriptionPlanFromMetadata,
  resolveMembershipPriceId,
} from "@/lib/launch/cash-launch-pricing"
import { getCheckoutProductById, getProductById } from "@/lib/products"
import { SUBSCRIPTION_CREDITS } from "@/lib/credits"

describe("private Maya tier pilot checkout", () => {
  afterEach(() => {
    delete process.env.MAYA_TIER_PILOT_CHECKOUT_ENABLED
    delete process.env.MAYA_TIER_PILOT_ALLOWLIST
  })

  it("keeps Essential out of the public catalog while exposing its checkout contract internally", () => {
    expect(getProductById("maya_essential_pilot")).toBeUndefined()
    expect(getCheckoutProductById("maya_essential_pilot")).toMatchObject({
      id: "maya_essential_pilot",
      type: "sselfie_studio_membership",
      priceInCents: 2900,
      credits: 30,
    })
  })

  it("fails closed until the pilot is enabled and the buyer is in a max-20 allowlist", () => {
    expect(() =>
      assertMayaTierPilotCheckoutAllowed({
        email: "buyer@example.com",
        plan: MAYA_ESSENTIAL_PILOT_PLAN,
        env: {},
      }),
    ).toThrow("not open")

    expect(() =>
      assertMayaTierPilotCheckoutAllowed({
        email: "buyer@example.com",
        plan: MAYA_ESSENTIAL_PILOT_PLAN,
        env: {
          MAYA_TIER_PILOT_CHECKOUT_ENABLED: "true",
          MAYA_TIER_PILOT_ALLOWLIST: Array.from(
            { length: 21 },
            (_, index) => `buyer${index}@example.com`,
          ).join(","),
        },
      }),
    ).toThrow("more than 20")

    expect(() =>
      assertMayaTierPilotCheckoutAllowed({
        email: "not-approved@example.com",
        plan: MAYA_PRO_PILOT_PLAN,
        env: {
          MAYA_TIER_PILOT_CHECKOUT_ENABLED: "true",
          MAYA_TIER_PILOT_ALLOWLIST: "buyer@example.com",
        },
      }),
    ).toThrow("not approved")

    expect(
      assertMayaTierPilotCheckoutAllowed({
        email: " Buyer@Example.com ",
        plan: MAYA_ESSENTIAL_PILOT_PLAN,
        env: {
          MAYA_TIER_PILOT_CHECKOUT_ENABLED: "true",
          MAYA_TIER_PILOT_ALLOWLIST: "buyer@example.com",
        },
      }),
    ).toEqual({ email: "buyer@example.com", allowlistSize: 1 })
  })

  it("resolves pilot prices and preserves the selected plan in subscription metadata", () => {
    expect(
      resolveMembershipPriceId({
        productType: "sselfie_studio_membership",
        requestedPlan: MAYA_ESSENTIAL_PILOT_PLAN,
        env: { STRIPE_MAYA_ESSENTIAL_PILOT_PRICE_ID: "price_essential" },
      }),
    ).toMatchObject({
      stripePriceId: "price_essential",
      envVarName: "STRIPE_MAYA_ESSENTIAL_PILOT_PRICE_ID",
      appliedPlan: MAYA_ESSENTIAL_PILOT_PLAN,
    })

    expect(
      resolveMembershipPriceId({
        productType: "sselfie_studio_membership",
        requestedPlan: MAYA_PRO_PILOT_PLAN,
        env: { STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID: "price_pro" },
      }),
    ).toMatchObject({
      stripePriceId: "price_pro",
      appliedPlan: MAYA_PRO_PILOT_PLAN,
    })

    expect(getSubscriptionPlanFromMetadata({ plan: MAYA_ESSENTIAL_PILOT_PLAN })).toBe(
      MAYA_ESSENTIAL_PILOT_PLAN,
    )
    expect(getSubscriptionPlanFromMetadata({ plan: MAYA_PRO_PILOT_PLAN })).toBe(
      MAYA_PRO_PILOT_PLAN,
    )
  })

  it("grants Essential only its promised 30 monthly credits", () => {
    expect(SUBSCRIPTION_CREDITS.maya_essential).toBe(30)
    expect(isMayaEssentialPlan(MAYA_ESSENTIAL_PILOT_PLAN)).toBe(true)
    expect(isMayaEssentialPlan(MAYA_PRO_PILOT_PLAN)).toBe(false)
    expect(creditGrantProductForMayaPlan(MAYA_ESSENTIAL_PILOT_PLAN, "sselfie_studio_membership")).toBe("maya_essential")
    expect(creditGrantProductForMayaPlan(MAYA_PRO_PILOT_PLAN, "sselfie_studio_membership")).toBe("sselfie_studio_membership")
    expect(creditGrantProductForMayaPlan(null, "vault_maya")).toBe("vault_maya")
  })

  it("keeps the private checkout and Essential access boundaries wired end to end", () => {
    const checkout = readFileSync("app/actions/landing-checkout.ts", "utf8")
    const membershipPage = readFileSync("app/checkout/membership/page.tsx", "utf8")
    const invoicePaid = readFileSync("lib/payments/lifecycle/invoice-paid.ts", "utf8")
    const appPage = readFileSync("app/app/page.tsx", "utf8")
    const shell = readFileSync("components/app-v3/app-v3-shell.tsx", "utf8")
    const library = readFileSync("app/api/app-v3/library/route.ts", "utf8")

    expect(checkout).toContain("assertMayaTierPilotCheckoutAllowed")
    expect(checkout).toContain('productId === "maya_essential_pilot" && requestedTierPilotPlan !== MAYA_ESSENTIAL_PILOT_PLAN')
    expect(membershipPage).toContain("isMayaTierPilotCheckoutPrepared")
    expect(invoicePaid).toContain("creditGrantProductForMayaPlan(sub.plan")
    expect(appPage).toContain('initialSection={mayaEssential ? "create" : initialSection}')
    expect(shell).toContain('item.id === "create" || item.id === "account"')
    expect(library).toContain("hasFullStudioMembership")
  })
})
