// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
const m = vi.hoisted(() => ({ access: vi.fn(), caption: vi.fn(), memory: vi.fn(), sql: vi.fn() }))
vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: async () => ({ user: { id: "auth-owner", email: "owner@test.invalid" } }),
}))
vi.mock("@/lib/user-mapping", () => ({ getUserByAuthId: async () => ({ id: "owner" }) }))
vi.mock("@/lib/rate-limit-api", () => ({ rateLimit: async () => ({ success: true }) }))
vi.mock("@/lib/maya/require-inference-access", () => ({ requireMayaInferenceAccess: m.access }))
vi.mock("@/lib/app-v3/maya/memory-store", () => ({ getMemory: m.memory }))
vi.mock("@/lib/maya/get-user-context", () => ({
  getUserContextForMaya: async () => "## CURRENT MEMBER MEMORY\nvoice: plain words",
}))
vi.mock("@/lib/data/maya", () => ({
  getUserPersonalBrand: async () => ({ brand_voice: "old voice", content_pillars: [] }),
}))
vi.mock("@/lib/feed-planner/caption-writer", () => ({ generateInstagramCaption: m.caption }))
vi.mock("@/lib/db/client", () => ({ sql: m.sql }))
import { POST } from "@/app/api/app-v3/maya/finish-post/route"
const request = (body: object) =>
  new NextRequest("https://test.invalid/api/app-v3/maya/finish-post", {
    method: "POST",
    body: JSON.stringify(body),
  })
beforeEach(() => {
  vi.clearAllMocks()
  m.access.mockResolvedValue({ allowed: true })
  m.sql.mockResolvedValue([{ caption: "Previous hook" }])
  m.caption.mockResolvedValue({ caption: "Finished" })
  m.memory.mockResolvedValue({
    facts: {
      length: { key: "length", value: "short" },
      "example-1": { key: "example-1", value: "Approved words" },
    },
  })
})
it("denies unpaid inference before calling the model or reading writing history", async () => {
  m.access.mockResolvedValue({
    allowed: false,
    status: 403,
    body: { error: "Membership required" },
  })
  expect((await POST(request({ format: "photo" }))).status).toBe(403)
  expect(m.caption).not.toHaveBeenCalled()
  expect(m.sql).not.toHaveBeenCalled()
})
it("passes current memory, approved writing, real source and previous hooks to finishing", async () => {
  expect(
    (
      await POST(
        request({
          format: "carousel",
          storySource: "I opened my shop today",
          existingCaption: "My own opening",
          captionContext: "New shop",
        })
      )
    ).status
  ).toBe(200)
  expect(m.caption).toHaveBeenCalledWith(
    expect.objectContaining({
      length: "short",
      approvedExamples: ["Approved words"],
      storySource: "I opened my shop today",
      captionType: "story",
      existingCaption: "My own opening",
      previousCaptions: [{ position: 1, caption: "Previous hook" }],
      memberContext: expect.stringContaining("plain words"),
    })
  )
  expect(m.sql.mock.calls[0].slice(1)).toContain("owner")
})
it("does not invent a personal source from an approved writing example", async () => {
  await POST(request({ format: "photo" }))
  expect(m.caption).toHaveBeenCalledWith(
    expect.objectContaining({ captionType: "value", storySource: undefined })
  )
})
