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

    expect(webhook).toContain("claimEvent({")
    expect(webhook).toContain('provider: "stripe"')
    expect(webhook).not.toContain("CREATE TABLE IF NOT EXISTS webhook_events")
    expect(migration).toContain(
      "CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_id_idx"
    )
    expect(migration).toContain("ON webhook_events (provider, event_id)")
  })

  it("claims a new provider/event pair and flags duplicate claims", async () => {
    vi.resetModules()
    const sqlMock = vi.fn(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (
        query.includes("INSERT INTO webhook_events") &&
        query.includes("provider") &&
        query.includes("event_id")
      ) {
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
      .mockRejectedValueOnce(
        Object.assign(new Error("column provider does not exist"), { code: "42703" })
      )
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

  it.each([
    {
      label: "fresh claimed",
      status: "claimed",
      updatedAt: "2026-08-20T11:55:00.000Z",
      allowStaleClaimReclaim: true,
      expectedClaimed: false,
      expectedDuplicateStatus: "in_progress",
    },
    {
      label: "claimed at the exact threshold",
      status: "claimed",
      updatedAt: "2026-08-20T11:45:00.000Z",
      allowStaleClaimReclaim: true,
      expectedClaimed: false,
      expectedDuplicateStatus: "in_progress",
    },
    {
      label: "stale claimed",
      status: "claimed",
      updatedAt: "2026-08-20T11:44:00.000Z",
      allowStaleClaimReclaim: true,
      expectedClaimed: true,
      expectedDuplicateStatus: null,
    },
    {
      label: "stale claimed without opt-in",
      status: "claimed",
      updatedAt: "2026-08-20T11:44:00.000Z",
      allowStaleClaimReclaim: false,
      expectedClaimed: false,
      expectedDuplicateStatus: "in_progress",
    },
    {
      label: "stale claimed with omitted opt-in",
      status: "claimed",
      updatedAt: "2026-08-20T11:44:00.000Z",
      allowStaleClaimReclaim: undefined,
      expectedClaimed: false,
      expectedDuplicateStatus: "in_progress",
    },
    {
      label: "failed",
      status: "failed",
      updatedAt: "2026-08-20T11:59:00.000Z",
      allowStaleClaimReclaim: false,
      expectedClaimed: true,
      expectedDuplicateStatus: null,
    },
    {
      label: "processed",
      status: "processed",
      updatedAt: "2026-08-19T12:00:00.000Z",
      allowStaleClaimReclaim: false,
      expectedClaimed: false,
      expectedDuplicateStatus: "processed",
    },
  ])(
    "applies atomic reclaim policy to a $label event",
    async ({
      status,
      updatedAt,
      allowStaleClaimReclaim,
      expectedClaimed,
      expectedDuplicateStatus,
    }) => {
      vi.resetModules()
      const now = new Date("2026-08-20T12:00:00.000Z")
      const eventId = `evt_${status}_${updatedAt}`
      const effectiveStaleClaimOptIn = allowStaleClaimReclaim === true
      const sqlMock = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = strings.join(" ")
        if (query.includes("INSERT INTO webhook_events")) return []
        if (query.includes("UPDATE webhook_events")) {
          const thresholdSeconds = values.find(value => typeof value === "number")
          const supportsStaleClaim =
            values.includes(effectiveStaleClaimOptIn) &&
            effectiveStaleClaimOptIn &&
            query.includes("status = 'claimed'") &&
            query.includes("updated_at < NOW()") &&
            !query.includes("first_seen_at =") &&
            thresholdSeconds === 15 * 60
          const stale =
            supportsStaleClaim &&
            new Date(updatedAt).getTime() < now.getTime() - thresholdSeconds * 1000
          const reclaimable = status === "failed" || (status === "claimed" && stale)
          return reclaimable ? [{ id: 2 }] : []
        }
        if (query.includes("SELECT status") && query.includes("FROM webhook_events")) {
          return [{ status }]
        }
        return []
      })

      vi.doMock("@/lib/db/client", () => ({ sql: sqlMock }))

      const { claimEvent } = await import("@/lib/events/idempotency")
      const claim = await claimEvent({
        provider: "stripe",
        eventId,
        eventType: "checkout.session.completed",
        allowStaleClaimReclaim,
      })

      expect(claim).toMatchObject({
        claimed: expectedClaimed,
        duplicate: !expectedClaimed,
        duplicateStatus: expectedDuplicateStatus,
        storage: "provider-event",
      })
      expect(sqlMock).toHaveBeenCalledTimes(expectedClaimed ? 2 : 3)

      const updateCalls = sqlMock.mock.calls.filter(call =>
        (call[0] as TemplateStringsArray).join(" ").includes("UPDATE webhook_events")
      )
      expect(updateCalls).toHaveLength(1)
      const [updateStrings, ...updateValues] = updateCalls[0]
      const updateQuery = (updateStrings as TemplateStringsArray).join(" ")
      expect(updateQuery).toMatch(
        /WHERE provider =\s+AND event_id =\s+AND \(\s+status = 'failed'\s+OR \(\s+AND status = 'claimed'\s+AND updated_at < NOW\(\)/
      )
      expect(updateValues).toEqual(
        expect.arrayContaining(["stripe", eventId, effectiveStaleClaimOptIn, 15 * 60])
      )
    }
  )

  it("allows only one concurrent caller to reclaim the same stale event", async () => {
    vi.resetModules()
    let staleClaimAvailable = true
    const sqlMock = vi.fn(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("INSERT INTO webhook_events")) return []
      if (query.includes("UPDATE webhook_events") && query.includes("RETURNING id")) {
        if (staleClaimAvailable) {
          staleClaimAvailable = false
          return [{ id: 7 }]
        }
        return []
      }
      if (query.includes("SELECT status") && query.includes("FROM webhook_events")) {
        return [{ status: "claimed" }]
      }
      return []
    })
    vi.doMock("@/lib/db/client", () => ({ sql: sqlMock }))

    const { claimEvent } = await import("@/lib/events/idempotency")
    const claims = await Promise.all([
      claimEvent({
        provider: "stripe",
        eventId: "evt_concurrent_stale",
        allowStaleClaimReclaim: true,
      }),
      claimEvent({
        provider: "stripe",
        eventId: "evt_concurrent_stale",
        allowStaleClaimReclaim: true,
      }),
    ])

    expect(claims.filter(claim => claim.claimed)).toHaveLength(1)
    expect(claims.filter(claim => claim.duplicateStatus === "in_progress")).toHaveLength(1)
  })
})
