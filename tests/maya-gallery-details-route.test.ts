// @vitest-environment node
import { beforeEach, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"
const m = vi.hoisted(() => ({ photos: vi.fn(), save: vi.fn(), generate: vi.fn(), access: vi.fn() }))
vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: async () => ({ user: { id: "auth", email: "owner@test.invalid" } }),
}))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: async () => ({ id: "owner" }) }))
vi.mock("@/lib/rate-limit-api", () => ({ rateLimit: async () => ({ success: true }) }))
vi.mock("@/lib/maya/require-inference-access", () => ({ requireMayaInferenceAccess: m.access }))
vi.mock("@/lib/app-v3/gallery-details", () => ({
  ownedGalleryPhotos: m.photos,
  saveGalleryDetails: m.save,
}))
vi.mock("@/lib/maya/openrouter", () => ({ createMayaOpenRouterModel: () => "test" }))
vi.mock("ai", () => ({ generateText: m.generate }))
import { PUT } from "@/app/api/app-v3/gallery/details/route"
const req = (body: object) =>
  new NextRequest("https://test.invalid/api/app-v3/gallery/details", {
    method: "PUT",
    body: JSON.stringify(body),
  })
beforeEach(() => {
  vi.clearAllMocks()
  m.photos.mockResolvedValue([
    { id: "ai_1", url: "https://owned.invalid/photo.png", description: "Coffee by the window" },
  ])
  m.access.mockResolvedValue({ allowed: true })
})
it("rejects a foreign photo before spending on its description", async () => {
  expect((await PUT(req({ assetId: "ai_99", describe: true }))).status).toBe(404)
  expect(m.photos).toHaveBeenCalledWith("owner")
  expect(m.generate).not.toHaveBeenCalled()
  expect(m.save).not.toHaveBeenCalled()
})
it("gates inference but allows owned library labels without inference", async () => {
  m.access.mockResolvedValue({
    allowed: false,
    body: { error: "Membership required" },
    status: 403,
  })
  expect((await PUT(req({ assetId: "ai_1", describe: true }))).status).toBe(403)
  expect((await PUT(req({ assetId: "ai_1", labels: "launch" }))).status).toBe(200)
  expect(m.generate).not.toHaveBeenCalled()
})
it("reuses a saved observation instead of generating it again", async () => {
  expect((await PUT(req({ assetId: "ai_1", describe: true }))).status).toBe(200)
  expect(m.generate).not.toHaveBeenCalled()
  expect(m.save).toHaveBeenCalledWith(
    "owner",
    "ai_1",
    expect.objectContaining({ description: "Coffee by the window" })
  )
})

it("lets the owner correct an inaccurate photo description without another model call", async () => {
  expect((await PUT(req({ assetId: "ai_1", description: "A tea cup on a desk" }))).status).toBe(200)
  expect(m.save).toHaveBeenCalledWith(
    "owner",
    "ai_1",
    expect.objectContaining({ description: "A tea cup on a desk" })
  )
  expect(m.generate).not.toHaveBeenCalled()
})
