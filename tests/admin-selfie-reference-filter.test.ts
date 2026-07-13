// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))

describe("admin identity reference pool", () => {
  beforeEach(() => {
    sqlMock.mockReset()
  })

  it("never returns inspiration images as Sandra identity references", async () => {
    sqlMock.mockResolvedValue([
      { image_url: "https://example.com/sandra-front.jpg", image_type: "selfie" },
      { image_url: "https://example.com/style-reference.jpg", image_type: "inspiration" },
      { image_url: "https://example.com/sandra-profile.jpg", image_type: "side-profile" },
      { image_url: "https://example.com/sandra-three-quarter.jpg", image_type: "three-quarter" },
      { image_url: "https://example.com/sandra-full-body.jpg", image_type: "full-body" },
    ])

    const { listAdminSelfies } = await import("@/lib/content-kit/demo-generator")

    await expect(listAdminSelfies()).resolves.toEqual([
      "https://example.com/sandra-front.jpg",
      "https://example.com/sandra-profile.jpg",
      "https://example.com/sandra-three-quarter.jpg",
      "https://example.com/sandra-full-body.jpg",
    ])

    const query = (sqlMock.mock.calls[0]?.[0] as TemplateStringsArray).join(" ")
    expect(query).toContain("uai.image_type IN")
  })

  it("rejects a submitted URL that is not in Sandra's verified admin pool", async () => {
    sqlMock.mockResolvedValue([
      { image_url: "https://example.com/sandra-front.jpg", image_type: "selfie" },
      { image_url: "https://example.com/style-reference.jpg", image_type: "inspiration" },
    ])

    const { areAdminIdentityReferences } = await import("@/lib/content-kit/demo-generator")

    await expect(
      areAdminIdentityReferences(["https://example.com/style-reference.jpg"]),
    ).resolves.toBe(false)
    await expect(
      areAdminIdentityReferences(["https://example.com/sandra-front.jpg"]),
    ).resolves.toBe(true)
  })
})
