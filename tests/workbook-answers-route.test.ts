// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), write: vi.fn() }))
vi.mock("@/lib/academy-server-access", () => ({
  requireAcademyProductAccess: mocks.auth,
  academyRouteErrorToResponse: (error: { status?: number }) =>
    error.status ? new Response("Denied", { status: error.status }) : null,
}))
vi.mock("@/lib/academy/workbook-answers", async importOriginal => ({
  ...(await importOriginal<object>()),
  readWorkbookAnswers: mocks.read,
  writeWorkbookAnswers: mocks.write,
}))
import { GET, PUT } from "@/app/api/academy/workbook-answers/route"
const answers = [{ key: "story", label: "Story", value: "Pottery" }]
const request = (overrides = {}, extraHeaders = {}) =>
  new Request("https://sselfie.ai/api/academy/workbook-answers", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify({
      userId: "member-a",
      productId: "what_to_say",
      revision: 0,
      answers,
      ...overrides,
    }),
  })
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ neonUser: { id: "member-a" } })
  mocks.write.mockResolvedValue({ revision: 1, updatedAt: "today" })
  mocks.read.mockResolvedValue([
    { productId: "what_to_say", answers },
    { productId: "get_paid", answers: [] },
  ])
})
describe("workbook answer authorization", () => {
  it("returns only the requested owned workbook with no shared cache", async () => {
    const response = await GET(
      new Request(
        "https://sselfie.ai/api/academy/workbook-answers?productId=what_to_say&userId=member-b"
      )
    )
    expect(mocks.read).toHaveBeenCalledWith("member-a")
    expect(await response.json()).toEqual({
      userId: "member-a",
      workbook: { productId: "what_to_say", answers },
    })
    expect(response.headers.get("cache-control")).toContain("no-store")
  })
  it.each([401, 403])("blocks unauthorized read and write (%s)", async status => {
    mocks.auth.mockRejectedValue({ status })
    expect((await PUT(request())).status).toBe(status)
    expect(
      (
        await GET(
          new Request("https://sselfie.ai/api/academy/workbook-answers?productId=what_to_say")
        )
      ).status
    ).toBe(status)
    expect(mocks.write).not.toHaveBeenCalled()
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it("does not save an old open tab's answers into a newly signed-in account", async () => {
    expect((await PUT(request({ userId: "member-b" }))).status).toBe(409)
    expect(mocks.write).not.toHaveBeenCalled()
  })
  it("saves under the authenticated account only", async () => {
    expect((await PUT(request())).status).toBe(200)
    expect(mocks.write).toHaveBeenCalledWith("member-a", "what_to_say", answers, 0)
  })
  it("rejects cross-origin writes and malformed answers", async () => {
    expect((await PUT(request({}, { origin: "https://other.example" }))).status).toBe(403)
    expect((await PUT(request({ answers: [{ value: "bad" }] }))).status).toBe(400)
    expect(mocks.write).not.toHaveBeenCalled()
  })
  it("reports conflicts and failed saves instead of success", async () => {
    mocks.write.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("offline"))
    expect((await PUT(request())).status).toBe(409)
    expect((await PUT(request())).status).toBe(503)
  })
})
