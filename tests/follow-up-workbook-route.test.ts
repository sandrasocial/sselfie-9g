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

function completeShowUpPlan() {
  return {
    cover: { title: "What To Post", subtitle: "Your plan", createdFor: "Sandra" },
    foundation: {
      monthlyFocus: "Make the offer clear.",
      audienceAction: "Reply.",
      realisticCapacity: "Four posts each week.",
      bestFormats: ["Selfies"],
      formatToAvoid: "Daily Reels",
      easierSystem: "Batch on Sunday.",
    },
    weeklyThemes: Array.from({ length: 4 }, (_, index) => ({
      week: `Week ${index + 1}`,
      theme: `Theme ${index + 1}`,
      purpose: `Purpose ${index + 1}`,
    })),
    posts: Array.from({ length: 30 }, (_, index) => ({
      day: `Day ${index + 1}`,
      week: `Week ${index < 8 ? 1 : index < 15 ? 2 : index < 23 ? 3 : 4}`,
      type: "Story",
      goal: "connection",
      hook: `Hook ${index + 1}`,
      captionStarter: `Caption ${index + 1}`,
      visual: "A selfie",
      cta: "Reply",
    })),
    existingAssetIdeas: ["Old posts", "Selfies", "Notes", "Messages", "Screenshots"],
    repurposingIdeas: ["One", "Two", "Three", "Four", "Five"],
    sundayBatchPlan: ["One", "Two", "Three", "Four", "Five"],
    getPaidInput: "A clear offer.",
    nextSteps: ["Post."],
  }
}

function completeGetPaidPlan() {
  return {
    cover: { title: "Get Paid", subtitle: "Your plan", createdFor: "Sandra" },
    offer: {
      name: "Starter Offer",
      oneSentence: "I help one person get one result.",
      exactResult: "One finished result.",
      timeline: "Seven days",
      price: "€100",
      deliverables: ["The result"],
      howToBuy: "DM START.",
    },
    buyer: {
      oneSentence: "One clear buyer.",
      struggle: "She is stuck.",
      desiredChange: "She wants clarity.",
      urgency: "She needs to act now.",
      willingnessToPay: "She asked for help.",
    },
    first500Path: {
      path: "Five offers.",
      simpleMath: "5 x €100 = €500.",
      firstMove: "Send one DM.",
    },
    salesPost: { hook: "Hook", story: "Story", bridge: "Bridge", offer: "Offer", cta: "DM START." },
    dmScripts: ["One", "Two", "Three"],
    followUps: ["One", "Two", "Three"],
    objectionReplies: Array.from({ length: 5 }, (_, index) => ({
      objection: `Objection ${index + 1}`,
      reply: "Reply",
    })),
    firstTenBuyerPrompts: Array.from({ length: 10 }, (_, index) => `Person ${index + 1}`),
    sevenDayPlan: Array.from({ length: 7 }, (_, index) => ({
      day: `Day ${index + 1}`,
      action: "Act",
      output: "Done",
    })),
    safety: { deliveryBoundary: "Clear scope.", nonGuarantee: "No result is guaranteed." },
    visibilityPlanInput: "One offer.",
    nextBestMove: "Post the offer.",
  }
}

describe("What To Post and Get Paid workbook generation route", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.requireAcademyUser.mockResolvedValue({
      authUser: { id: "auth-1", email: "sandra@example.com" },
      neonUser: { id: "user-1", email: "sandra@example.com" },
    })
    mocks.logAnalyticsEvent.mockResolvedValue(undefined)
  })

  it.each([
    {
      productId: "show_up",
      output: completeShowUpPlan(),
      label: "Your Complete What To Post PDF",
      maxOutputTokens: 7600,
    },
    {
      productId: "get_paid",
      output: completeGetPaidPlan(),
      label: "Your Complete Get Paid PDF",
      maxOutputTokens: 6200,
    },
  ])("saves a complete $productId document and returns its result URL", async testCase => {
    mocks.getAcademyEntitlementState.mockResolvedValue({
      membershipActive: false,
      accessibleProductIds: [testCase.productId],
    })
    mocks.generateText.mockResolvedValue({ text: JSON.stringify(testCase.output) })
    mocks.sql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ access_token: "22222222-2222-4222-8222-222222222222" }])

    const { POST } = await import("@/app/api/academy/visibility-suite/workbook/route")
    const response = await POST(
      new Request("https://sselfie.ai/api/academy/visibility-suite/workbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: testCase.productId,
          action: "generate",
          answers: [{ label: "What are you building?", value: "A practical offer for women." }],
        }),
      }) as never
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      label: testCase.label,
      token: "22222222-2222-4222-8222-222222222222",
      url: "/academy/workbook-result/22222222-2222-4222-8222-222222222222",
    })
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: testCase.maxOutputTokens })
    )
    expect(mocks.sql).toHaveBeenCalledTimes(4)
    expect(mocks.logAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          product_id: testCase.productId,
          output_type: "complete_pdf",
        }),
      })
    )
  })
})
