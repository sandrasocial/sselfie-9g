// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { buildCheckoutSessionIdempotencyKey } from "@/lib/checkout/session-idempotency"

describe("checkout session idempotency keys", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-15T08:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("keeps true duplicate one-time checkout attempts idempotent inside the time bucket", () => {
    const input = {
      productType: "prompt_vault",
      stripePriceId: "price_prompt_vault",
      customerEmail: "Sandra@Example.com",
      promoCode: null,
      sessionScope: {
        metadata: {
          source: "ai_prompts_access",
          utm_content: "shoot-cafe-shot-1",
        },
      },
    }

    expect(buildCheckoutSessionIdempotencyKey(input)).toBe(
      buildCheckoutSessionIdempotencyKey({
        ...input,
        customerEmail: "sandra@example.com",
        sessionScope: {
          metadata: {
            utm_content: "shoot-cafe-shot-1",
            source: "ai_prompts_access",
          },
        },
      })
    )
  })

  it("changes the idempotency key when checkout metadata changes", () => {
    const base = {
      productType: "prompt_vault",
      stripePriceId: "price_prompt_vault",
      customerEmail: "lead@example.com",
      promoCode: null,
    }

    const cafeKey = buildCheckoutSessionIdempotencyKey({
      ...base,
      sessionScope: {
        metadata: {
          source: "ai_prompts_access",
          utm_content: "shoot-cafe-shot-1",
        },
      },
    })
    const vogueKey = buildCheckoutSessionIdempotencyKey({
      ...base,
      sessionScope: {
        metadata: {
          source: "ai_prompts_access",
          utm_content: "shoot-mysterious-vogue-shot-1",
        },
      },
    })

    expect(cafeKey).not.toBe(vogueKey)
  })

  it("does not send an idempotency key for anonymous no-email checkout sessions", () => {
    expect(
      buildCheckoutSessionIdempotencyKey({
        productType: "prompt_vault",
        stripePriceId: "price_prompt_vault",
        customerEmail: null,
      })
    ).toBeNull()
  })
})
