// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

describe("revenue product control registry", () => {
  it("splits live and archived pricing products while preserving the public export", async () => {
    const {
      ARCHIVED_PRICING_PRODUCTS,
      LIVE_PRICING_PRODUCTS,
      PRICING_PRODUCTS,
      PRODUCT_REVENUE_PATHS,
    } = await import("@/lib/products")

    expect(LIVE_PRICING_PRODUCTS.map(product => product.id)).not.toContain("visibility_suite")
    expect(ARCHIVED_PRICING_PRODUCTS.map(product => product.id)).toContain("visibility_suite")
    expect(PRICING_PRODUCTS.map(product => product.id)).toContain("visibility_suite")
    expect(PRODUCT_REVENUE_PATHS.visibility_suite.lifecycleStatus).toBe("archived")
  })

  it("declares one checkout, fulfillment, success, and email owner for each revenue product", async () => {
    const { PRODUCT_REVENUE_PATHS } = await import("@/lib/products")

    for (const [productId, path] of Object.entries(PRODUCT_REVENUE_PATHS)) {
      expect(path.checkoutPath, `${productId} checkoutPath`).toBeTruthy()
      expect(path.fulfillmentRule, `${productId} fulfillmentRule`).toBeTruthy()
      expect(path.successNextAction, `${productId} successNextAction`).toBeTruthy()
      expect(path.lifecycleEmailEntryPoint, `${productId} lifecycleEmailEntryPoint`).toBeTruthy()
    }

    expect(PRODUCT_REVENUE_PATHS.starter_kit).toMatchObject({
      checkoutPath: "/checkout/starter-kit",
      fulfillmentRule: "stripe_webhook.checkout.session.completed:starter_kit",
      successNextAction: "/academy/access/starter-kit",
      lifecycleEmailEntryPoint: "starter_kit_delivery",
    })
    expect(PRODUCT_REVENUE_PATHS.masterclass).toMatchObject({
      checkoutPath: "/checkout/masterclass",
      fulfillmentRule: "stripe_webhook.checkout.session.completed:masterclass",
      successNextAction: "/academy/access/brand-strategy",
      lifecycleEmailEntryPoint: "masterclass_delivery",
    })
  })
})

describe("event idempotency controls", () => {
  it("uses provider and event_id as the Stripe webhook idempotency key", () => {
    const webhook = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")
    const migration = readFileSync("db/migrations/56-add-event-idempotency-controls.sql", "utf8")

    expect(webhook).toContain('claimEvent({')
    expect(webhook).toContain('provider: "stripe"')
    expect(webhook).not.toContain("CREATE TABLE IF NOT EXISTS webhook_events")
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_id_idx")
    expect(migration).toContain("ON webhook_events (provider, event_id)")
  })

  it("claims a new provider/event pair and flags duplicate claims", async () => {
    vi.resetModules()
    const sqlMock = vi.fn(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("INSERT INTO webhook_events") && query.includes("provider") && query.includes("event_id")) {
        return [{ id: 1 }]
      }
      return []
    })

    vi.doMock("@/lib/db/client", () => ({ sql: sqlMock }))

    const { claimEvent } = await import("@/lib/events/idempotency")
    const claim = await claimEvent({
      provider: "stripe",
      eventId: "evt_phase4_1",
      eventType: "checkout.session.completed",
      objectId: "cs_phase4_1",
      livemode: true,
    })

    expect(claim).toMatchObject({
      claimed: true,
      duplicate: false,
      provider: "stripe",
      eventId: "evt_phase4_1",
      storage: "provider-event",
    })
  })

  it("falls back to legacy stripe_event_id storage until migration 56 is applied", async () => {
    vi.resetModules()
    const sqlMock = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("column provider does not exist"), { code: "42703" }))
      .mockResolvedValueOnce([{ id: 2 }])

    vi.doMock("@/lib/db/client", () => ({ sql: sqlMock }))

    const { claimEvent } = await import("@/lib/events/idempotency")
    const claim = await claimEvent({
      provider: "stripe",
      eventId: "evt_legacy_1",
      eventType: "invoice.payment_succeeded",
    })

    expect(claim).toMatchObject({
      claimed: true,
      duplicate: false,
      storage: "legacy-stripe-event",
    })
    expect(sqlMock).toHaveBeenCalledTimes(2)
  })
})
