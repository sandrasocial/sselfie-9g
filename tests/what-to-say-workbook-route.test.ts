// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  requireAcademyUser: vi.fn(),
  getAcademyEntitlementState: vi.fn(),
  logAnalyticsEvent: vi.fn(),
  sql: vi.fn(),
  createMayaOpenRouterModel: vi.fn(() => ({ modelId: "test-model" })),
}))

vi.mock("ai", () => ({ generateText: mocks.generateText }))
vi.mock("@/lib/academy-server-access", () => ({
  requireAcademyUser: mocks.requireAcademyUser,
  academyRouteErrorToResponse: vi.fn(() => null),
}))
vi.mock("@/lib/academy-entitlements", () => ({
  getAcademyEntitlementState: mocks.getAcademyEntitlementState,
}))
vi.mock("@/lib/analytics/events", () => ({ logAnalyticsEvent: mocks.logAnalyticsEvent }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/maya/openrouter", () => ({
  createMayaOpenRouterModel: mocks.createMayaOpenRouterModel,
}))

function completeOutput() {
  return {
    cover: { title: "What To Say", subtitle: "Your message", createdFor: "Sandra" },
    coreMessage: {
      oneLineMessage: "I help women say the real thing.",
      iHelpStatement: "I help women share their story with confidence.",
      instagramBio: "Helping women share their story and show up.",
    },
    foundation: {
      audience: "A woman building from her phone.",
      audienceSelfTalk: "I never know what to post.",
      transformation: "She can explain what she does clearly.",
      authority: "I learned this by building it myself.",
      story: "I started from scratch and kept showing up.",
      expertise: "Clear, personal content.",
      values: "Real over polished.",
      vision: "More women building what matters to them.",
      voice: "Warm, direct, and specific.",
    },
    contentBuckets: ["Story", "Teach", "Sell", "Connect"].map(name => ({
      name,
      purpose: `${name} with a clear reason.`,
      postIdeas: [`${name} idea one`, `${name} idea two`, `${name} idea three`],
    })),
    brandWords: ["real", "seen", "built it"],
    hooks: Array.from({ length: 10 }, (_, index) => `Finished hook ${index + 1}`),
    captions: Array.from({ length: 3 }, (_, index) => ({
      label: `Caption ${index + 1}`,
      hook: `Hook ${index + 1}`,
      body: `A complete caption body ${index + 1}.`,
      cta: "Reply and tell me where you are stuck.",
    })),
    softCta: "Reply if this sounds like you.",
    offerBridge: "If you want help with this, I made something for you.",
    nextSteps: ["Update your bio.", "Post the first caption.", "Start a conversation."],
  }
}

describe("What To Say workbook generation route", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.requireAcademyUser.mockResolvedValue({
      authUser: { id: "auth-1", email: "sandra@example.com" },
      neonUser: { id: "user-1", email: "sandra@example.com" },
    })
    mocks.getAcademyEntitlementState.mockResolvedValue({
      membershipActive: false,
      accessibleProductIds: ["what_to_say"],
    })
    mocks.generateText.mockResolvedValue({ text: JSON.stringify(completeOutput()) })
    mocks.sql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ access_token: "11111111-1111-4111-8111-111111111111" }])
    mocks.logAnalyticsEvent.mockResolvedValue(undefined)
  })

  it("saves the complete document and returns its personalized result URL", async () => {
    const { POST } = await import("@/app/api/academy/visibility-suite/workbook/route")
    const response = await POST(
      new Request("https://sselfie.ai/api/academy/visibility-suite/workbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: "what_to_say",
          action: "generate",
          answers: [
            { label: "Who is your one person?", value: "A woman building from her phone." },
            { label: "Your story", value: "I started from scratch and kept showing up." },
          ],
        }),
      }) as never
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      label: "Your Complete What To Say PDF",
      token: "11111111-1111-4111-8111-111111111111",
      url: "/academy/what-to-say-result/11111111-1111-4111-8111-111111111111",
    })
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: 5200 })
    )
    expect(mocks.sql).toHaveBeenCalledTimes(4)
    expect(mocks.logAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ output_type: "complete_pdf" }),
      })
    )
  })
})
