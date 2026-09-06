// @vitest-environment node
import { beforeEach, it, expect, vi } from "vitest"
const m = vi.hoisted(() => ({ fact: vi.fn(), save: vi.fn(), auth: vi.fn() }))
vi.mock("@/lib/auth-helper", () => ({ getAuthenticatedUser: m.auth }))
vi.mock("@/lib/user-mapping", () => ({ getUserIdFromSupabase: async () => "owner" }))
vi.mock("@/lib/app-v3/maya/memory-store", () => ({
  getMemory: async () => ({ facts: {}, brandNotes: "Original notes" }),
  saveMemoryFact: m.fact,
  saveMemory: m.save,
  addLikenessNote: vi.fn(),
  removeLikenessNote: vi.fn(),
}))
vi.mock("@/lib/app-v3/maya/brand-profile-store", () => ({
  getBrandProfileSummary: vi.fn(),
  hasUsableBrandProfile: vi.fn(),
}))
vi.mock("@/lib/feed-planner/resolve-feed-style", () => ({
  clearPreferredFeedStyle: vi.fn(),
  getPreferredFeedStyle: async () => null,
}))
vi.mock("@/lib/analytics/events", () => ({ logAnalyticsEvent: vi.fn(async () => {}) }))
import { PUT } from "@/app/api/app-v3/maya/memory/route"
const req = (body: object) =>
  new Request("https://test.invalid/memory", { method: "PUT", body: JSON.stringify(body) })
beforeEach(() => {
  vi.clearAllMocks()
  m.auth.mockResolvedValue({ user: { id: "auth-owner" } })
  m.fact.mockResolvedValue(undefined)
})
it("writes corrections only for the authenticated owner and leaves unrelated notes alone", async () => {
  expect(
    (
      await PUT(
        req({
          userId: "someone-else",
          fact: { key: "offer", value: "New workshop", source: "Member edited in Memory" },
        })
      )
    ).status
  ).toBe(200)
  expect(m.fact).toHaveBeenCalledWith("owner", {
    key: "offer",
    value: "New workshop",
    source: "Member edited in Memory",
  })
  expect(m.save).not.toHaveBeenCalled()
})
it("persists a forgotten fact as an explicit null rather than silently dropping the request", async () => {
  expect(
    (await PUT(req({ fact: { key: "offer", value: null, source: "Forget my offer" } }))).status
  ).toBe(200)
  expect(m.fact).toHaveBeenCalledWith(
    "owner",
    expect.objectContaining({ key: "offer", value: null })
  )
})
it("rejects malformed memory fields before writing", async () => {
  expect((await PUT(req({ brandNotes: { arbitrary: "object" } }))).status).toBe(400)
  expect(m.save).not.toHaveBeenCalled()
  expect((await PUT(req({ fact: { key: "offer", value: "workshop" } }))).status).toBe(400)
  expect(m.fact).not.toHaveBeenCalled()
})
it("reports save failure instead of claiming memory was changed", async () => {
  m.fact.mockRejectedValue(new Error("database unavailable"))
  expect(
    (await PUT(req({ fact: { key: "voice", value: "plain words", source: "Member edited" } })))
      .status
  ).toBe(500)
})
