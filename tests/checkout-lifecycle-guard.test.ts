// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createSession, createServerClient } = vi.hoisted(() => ({
  createSession: vi.fn(),
  createServerClient: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
}))
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: { sessions: { create: createSession } },
    coupons: { retrieve: vi.fn() },
  },
}))
vi.mock("@/lib/supabase/server", () => ({ createServerClient }))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: vi.fn() }))
vi.mock("@/lib/db/client", () => ({ sql: vi.fn(), getDb: vi.fn() }))
vi.mock("@/lib/revenue-engine/checkout-attribution", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/revenue-engine/checkout-attribution")>()
  return { ...actual, upsertCheckoutAttribution: vi.fn() }
})

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { startProductCheckoutSession } from "@/app/actions/stripe"
import {
  PRICING_PRODUCTS,
  PRODUCT_REVENUE_PATHS,
  assertNewCheckoutProductAllowed,
  getProductById,
  resolveNewCheckoutLifecycle,
} from "@/lib/products"

describe("new checkout lifecycle guard", () => {
  beforeEach(() => {
    createSession.mockReset()
    createServerClient.mockReset()
    vi.stubEnv("STRIPE_PRICE_STARTER_KIT", "")
    vi.stubEnv("MAYA_TIER_PILOT_CHECKOUT_ENABLED", "")
    vi.stubEnv("MAYA_TIER_PILOT_ALLOWLIST", "")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(["one_time_session", "selfie_guide", "selfie_guide_bundle"])(
    "blocks %s before either checkout action can contact Stripe",
    async productId => {
      expect(resolveNewCheckoutLifecycle(productId)).toMatchObject({
        status: "blocked",
        product: { id: productId },
        ...(productId === "selfie_guide_bundle"
          ? { blockedBy: "legacy_checkout_path" }
          : {}),
      })

      await expect(createLandingCheckoutSession(productId)).rejects.toThrow(
        `New checkout is not allowed for ${productId}`
      )
      await expect(startProductCheckoutSession(productId)).rejects.toThrow(
        `New checkout is not allowed for ${productId}`
      )

      expect(createSession).not.toHaveBeenCalled()
      expect(createServerClient).not.toHaveBeenCalled()
    }
  )

  it("blocks every archived or legacy-access product while preserving historical lookup", () => {
    const blockedIds = PRICING_PRODUCTS.filter(product => {
      const lifecycle =
        product.lifecycleStatus || PRODUCT_REVENUE_PATHS[product.id]?.lifecycleStatus
      return lifecycle === "archived" || lifecycle === "legacy_access_only"
    }).map(product => product.id)

    expect(blockedIds).toEqual(
      expect.arrayContaining([
        "one_time_session",
        "paid_blueprint",
        "brand_strategy_pack",
        "visibility_suite",
        "selfie_guide",
        "selfie_guide_bundle",
        "selfie_to_brand_shoot_system",
      ])
    )
    for (const productId of blockedIds) {
      expect(() => assertNewCheckoutProductAllowed(productId)).toThrow(
        `New checkout is not allowed for ${productId}`
      )
      expect(getProductById(productId)).toMatchObject({ id: productId })
    }
  })

  it("keeps historical fulfillment metadata intact", () => {
    expect(PRODUCT_REVENUE_PATHS.one_time_session).toMatchObject({
      lifecycleStatus: "archived",
      fulfillmentRule: "stripe_webhook.checkout.session.completed:one_time_session",
    })
    expect(PRODUCT_REVENUE_PATHS.selfie_guide).toMatchObject({
      lifecycleStatus: "legacy_access_only",
      fulfillmentRule: "stripe_webhook.checkout.session.completed:selfie_guide",
    })
    expect(PRODUCT_REVENUE_PATHS.selfie_guide_bundle).toMatchObject({
      lifecycleStatus: "legacy_access_only",
      checkoutPath: "legacy:webhook-only bundle fulfillment",
      fulfillmentRule: "stripe_webhook.checkout.session.completed:selfie_guide_bundle",
    })
    expect(getProductById("selfie_guide_bundle")).toMatchObject({
      id: "selfie_guide_bundle",
      lifecycleStatus: "legacy_access_only",
    })
  })

  it("allows live products and the private pilot to continue to their existing gates", async () => {
    expect(resolveNewCheckoutLifecycle("starter_kit")).toMatchObject({
      status: "allowed",
      source: "public_catalog",
      product: { id: "starter_kit" },
    })
    expect(resolveNewCheckoutLifecycle("maya_essential_pilot")).toMatchObject({
      status: "allowed",
      source: "private_pilot",
      product: { id: "maya_essential_pilot" },
    })

    await expect(createLandingCheckoutSession("starter_kit")).rejects.toThrow(
      "Missing: STRIPE_PRICE_STARTER_KIT"
    )
    await expect(createLandingCheckoutSession("maya_essential_pilot")).rejects.toThrow(
      "requires its approved pilot plan"
    )
    await expect(
      createLandingCheckoutSession("maya_essential_pilot", undefined, "buyer@example.com", {
        membershipPlan: "maya_essential_pilot",
      })
    ).rejects.toThrow("private Maya tier pilot is not open")
    expect(createSession).not.toHaveBeenCalled()
  })

  it("denies the private pilot from checkout actions that do not run its allowlist", async () => {
    await expect(startProductCheckoutSession("maya_essential_pilot")).rejects.toThrow(
      "Private pilot checkout requires the guarded landing checkout"
    )
    expect(createServerClient).not.toHaveBeenCalled()
    expect(createSession).not.toHaveBeenCalled()
  })
})
