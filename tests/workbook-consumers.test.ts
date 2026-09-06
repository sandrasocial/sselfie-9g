// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  entitlement: vi.fn(),
  read: vi.fn(),
  generate: vi.fn(),
  analytics: vi.fn(),
}))
vi.mock("ai", () => ({ generateText: mocks.generate }))
vi.mock("@/lib/academy-server-access", () => ({
  requireAcademyUser: mocks.auth,
  academyRouteErrorToResponse: () => null,
}))
vi.mock("@/lib/academy-entitlements", () => ({ getAcademyEntitlementState: mocks.entitlement }))
vi.mock("@/lib/academy/workbook-answers", () => ({ readWorkbookAnswers: mocks.read }))
vi.mock("@/lib/analytics/events", () => ({ logAnalyticsEvent: mocks.analytics }))
vi.mock("@/lib/maya/openrouter", () => ({ createMayaOpenRouterModel: () => "test-model" }))
vi.mock("@/lib/db/client", () => ({ sql: vi.fn() }))
vi.mock("@/lib/generation/prompt", () => ({ generateVisibilityPlanPromptViaAuthority: vi.fn() }))
import { POST as chat } from "@/app/api/academy/visibility-suite/chat/route"
import { POST as plan } from "@/app/api/academy/visibility-suite/plan/generate/route"
const request = () =>
  new Request("https://sselfie.ai/api/academy/visibility-suite/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Use my story",
      userId: "member-b",
      ownedProducts: ["get_paid"],
      answers: [{ productId: "get_paid", label: "Story", value: "Other browser user" }],
    }),
  }) as never
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ authUser: { id: "auth-a" }, neonUser: { id: "member-a" } })
  mocks.entitlement.mockResolvedValue({
    membershipActive: false,
    accessibleProductIds: ["what_to_say"],
  })
  mocks.read.mockResolvedValue([
    {
      productId: "what_to_say",
      answers: [{ key: "story", label: "Story", value: "My pottery story" }],
    },
    {
      productId: "get_paid",
      answers: [{ key: "offer", label: "Offer", value: "Unowned course answer" }],
    },
  ])
  mocks.generate.mockResolvedValue({ text: "Your pottery story." })
})
describe("existing Academy consumers use account-owned answers", () => {
  it("uses saved answers for classroom Maya and ignores the old browser payload", async () => {
    expect((await chat(request())).status).toBe(200)
    expect(mocks.read).toHaveBeenCalledWith("member-a")
    const prompt = mocks.generate.mock.calls[0][0].prompt
    expect(prompt).toContain("My pottery story")
    expect(prompt).not.toContain("Other browser user")
    expect(prompt).not.toContain("Unowned course answer")
  })
  it.each([chat, plan])("checks access before reading any stored answers", async route => {
    mocks.entitlement.mockResolvedValue({ membershipActive: false, accessibleProductIds: [] })
    expect((await route(request())).status).toBe(403)
    expect(mocks.read).not.toHaveBeenCalled()
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it("the plan generator does not create a plan from another user's browser cache", async () => {
    mocks.read.mockResolvedValue([])
    expect((await plan(request())).status).toBe(400)
    expect(mocks.read).toHaveBeenCalledWith("member-a")
    expect(mocks.generate).not.toHaveBeenCalled()
  })
})
