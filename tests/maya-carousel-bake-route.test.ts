// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import sharp from "sharp"
const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  auth: vi.fn(),
  charge: vi.fn(),
  put: vi.fn(),
  edit: vi.fn(),
  balance: vi.fn(),
}))
vi.mock("@/lib/app-v3/maya/carousel-review", () => ({
  reviewCarouselSlide: async () => ({ slide: 1, status: "checked", issues: [] }),
}))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ getDbClient: () => mocks.sql }))
vi.mock("@/lib/auth-helper", () => ({ getAuthenticatedUser: mocks.auth }))
vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: async () => ({ id: "member-1" }),
}))
vi.mock("@/lib/admin-feature-flags", () => ({ isAdminEmail: () => false }))
vi.mock("@/lib/trial/suite-trial", () => ({ canGenerate: async () => true }))
vi.mock("@/lib/rate-limit-api", () => ({ rateLimit: async () => ({ success: true }) }))
vi.mock("@/lib/feature-flags", () => ({ isOpenAIImageEnabled: () => true }))
vi.mock("@/lib/credits", () => ({
  checkCredits: mocks.charge,
  deductCredits: mocks.charge,
  refundCredits: mocks.charge,
  getUserCredits: mocks.balance,
  CREDIT_COSTS: { IMAGE: 1 },
}))
vi.mock("@/lib/admin-error-log", () => ({ logAdminError: vi.fn() }))
vi.mock("@vercel/blob", () => ({ put: mocks.put }))
vi.mock("openai", () => ({
  default: class {
    images = { edit: mocks.edit }
  },
  toFile: vi.fn(),
}))
const url = "https://owned.public.blob.vercel-storage.com/slide.png"
const request = () =>
  new NextRequest("http://localhost/api/app-v3/maya/bake-text", {
    method: "POST",
    body: JSON.stringify({
      cleanImageUrl: url,
      spec: {
        headline: "Your real story",
        format: "carousel",
        style: "top-band-minimal",
        position: "bottom",
      },
    }),
  })
beforeEach(async () => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ user: { id: "auth-1", email: "member@example.com" } })
  mocks.sql.mockImplementation(async (parts: TemplateStringsArray) =>
    parts.join("").includes("INSERT") ? [{ id: 42 }] : [{ id: 12 }]
  )
  mocks.balance.mockResolvedValue(0)
  mocks.put.mockResolvedValue({ url: "https://owned.public.blob.vercel-storage.com/words.png" })
  const base = await sharp({
    create: { width: 1080, height: 1350, channels: 3, background: "white" },
  })
    .png()
    .toBuffer()
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(base))
  )
})
describe("member carousel text route", () => {
  it("composes and persists a selected slide at zero image credits without an AI call", async () => {
    const { POST } = await import("@/app/api/app-v3/maya/bake-text/route")
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ aiImageId: 42, newBalance: 0 })
    expect(mocks.charge).not.toHaveBeenCalled()
    expect(mocks.edit).not.toHaveBeenCalled()
    expect(mocks.put).toHaveBeenCalledTimes(1)
    expect(mocks.sql.mock.calls.every(call => call.slice(1).includes("member-1"))).toBe(true)
  })
  it("rejects an image belonging to somebody else before fetching or storing it", async () => {
    mocks.sql.mockResolvedValue([])
    const { POST } = await import("@/app/api/app-v3/maya/bake-text/route")
    expect((await POST(request())).status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
    expect(mocks.put).not.toHaveBeenCalled()
    expect(mocks.charge).not.toHaveBeenCalled()
  })
  it("requires authentication", async () => {
    mocks.auth.mockResolvedValue({ user: null })
    const { POST } = await import("@/app/api/app-v3/maya/bake-text/route")
    expect((await POST(request())).status).toBe(401)
    expect(mocks.sql).not.toHaveBeenCalled()
  })
  it("reports failed persistence without charging or claiming completion", async () => {
    mocks.put.mockRejectedValueOnce(new Error("storage unavailable"))
    const { POST } = await import("@/app/api/app-v3/maya/bake-text/route")
    expect((await POST(request())).status).toBe(422)
    expect(mocks.charge).not.toHaveBeenCalled()
  })
})
