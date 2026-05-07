// @vitest-environment node

import fs from "fs"
import path from "path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const ROOT = process.cwd()
const sqlMock = vi.fn()
const refundCreditsMock = vi.fn()
const checkNanoBananaPredictionMock = vi.fn()

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => sqlMock),
}))

vi.mock("@/lib/academy-server-access", () => ({
  requireAcademyUser: vi.fn().mockResolvedValue({ neonUser: { id: "user_transform_1" } }),
}))

vi.mock("@/lib/credits", () => ({
  refundCredits: refundCreditsMock,
}))

vi.mock("@/lib/nano-banana-client", () => ({
  checkNanoBananaPrediction: checkNanoBananaPredictionMock,
}))

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}))

describe("Transform launch readiness", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.DATABASE_URL = "postgres://user:pass@example.com/db"
  })

  it("uses first-class Transform checkout metadata", () => {
    const checkout = fs.readFileSync(path.join(ROOT, "app/actions/transform-checkout.ts"), "utf8")

    expect(checkout).toContain('type TransformProductType = "transform_starter" | "transform_topup"')
    expect(checkout).toContain('source: "transform_paid"')
    expect(checkout).toContain('return_to: "/transform/studio"')
    expect(checkout).toContain('buyer_stage: "aesthetic_editing"')
    expect(checkout).toContain('offer_slug: "transform"')
    expect(checkout).not.toContain('source: "transform_checkout"')
  })

  it("webhook treats Transform as a public paid product and routes setup to the editor", () => {
    const webhook = fs.readFileSync(path.join(ROOT, "app/api/webhooks/stripe/route.ts"), "utf8")

    expect(webhook).toContain('source === "transform_paid"')
    expect(webhook).toContain('productType === "transform_starter" || productType === "transform_topup"')
    expect(webhook).toContain('isTransformProductType(productType) ? "/transform/studio"')
    expect(webhook).toContain("'transform',")
    expect(webhook).toContain("stripe_webhook:${productType}")
  })

  it("seeded presets preserve identity instead of describing new people", () => {
    const seed = fs.readFileSync(path.join(ROOT, "scripts/55-create-transform-tables.sql"), "utf8")

    expect(seed).toContain("Preserve the person''s exact face, identity, age, body")
    expect(seed).toContain("Do not create a new person")
    expect(seed).not.toContain("A woman photographed")
    expect(seed).not.toContain("The image could be used on a website")
  })

  it("refunds credits once when a Transform prediction fails", async () => {
    sqlMock.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join(" ")
      if (query.includes("FROM transform_generations")) {
        return [{ id: 1, status: "processing", output_image_url: null, credits_used: 3 }]
      }
      return []
    })
    checkNanoBananaPredictionMock.mockResolvedValue({ status: "failed" })
    refundCreditsMock.mockResolvedValue({ success: true, newBalance: 15, refunded: true })

    const { NextRequest } = await import("next/server")
    const { GET } = await import("@/app/api/transform/check/route")
    const response = await GET(new NextRequest("http://localhost/api/transform/check?id=pred_transform_1"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(refundCreditsMock).toHaveBeenCalledWith(
      "user_transform_1",
      3,
      "Transform edit failed - credits returned",
      "pred_transform_1",
    )
    expect(body).toMatchObject({
      status: "failed",
      creditsRefunded: true,
      creditsRemaining: 15,
    })
  })

  it("does not refund again when the generation is already marked failed", async () => {
    sqlMock.mockResolvedValue([{ id: 1, status: "failed", output_image_url: null, credits_used: 3 }])

    const { NextRequest } = await import("next/server")
    const { GET } = await import("@/app/api/transform/check/route")
    const response = await GET(new NextRequest("http://localhost/api/transform/check?id=pred_transform_1"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(refundCreditsMock).not.toHaveBeenCalled()
    expect(body.status).toBe("failed")
  })
})
