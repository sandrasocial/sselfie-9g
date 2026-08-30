// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
}))

vi.mock("ai", () => ({ generateText: mocks.generateText }))
vi.mock("@/lib/maya/openrouter", () => ({
  createMayaOpenRouterModel: vi.fn(() => "mock-caption-model"),
}))
vi.mock("@/lib/instagram-strategist/personality", () => ({
  INSTAGRAM_STRATEGIST_SYSTEM_PROMPT: "mock-system",
}))

describe("generated caption factual safety", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("refuses to save an invented first-person claim when the rewrite is still unsafe", async () => {
    const unsafe = [
      "Here's the trick I give every busy mom I talk to.",
      "My clients use it when mornings feel rushed, because a smaller routine is easier to repeat.",
      "Start with one glass of water, one minute of movement, and one choice you can make before the day gets loud.",
      "Keep the plan visible and simple enough to return to after an imperfect day.",
      "Tell me which small step feels realistic for tomorrow.",
    ].join("\n\n")
    mocks.generateText.mockResolvedValue({ text: unsafe })

    const { generateInstagramCaption } = await import("@/lib/feed-planner/caption-writer")

    await expect(
      generateInstagramCaption({
        postPosition: 2,
        shotType: "portrait",
        purpose: "simple wellness routines",
        emotionalTone: "helpful",
        brandProfile: { business_type: "wellness coach" },
        targetAudience: "busy mothers",
        brandVoice: "warm and practical",
        captionType: "value",
        storySource: null,
      })
    ).rejects.toThrow("verified context")
    expect(mocks.generateText).toHaveBeenCalledTimes(2)
  })

  it("grounds the draft in existing selected-photo context without uploading the photo", async () => {
    const safeCaption = [
      "A quiet frame can hold a clear point.",
      "When the image already feels calm and focused, the caption does not need to compete with it. Choose one useful idea, explain it in everyday words, and let the visual pause support the message. That makes the post feel intentional without turning it into a polished sales pitch. Keep the next step small enough to use today, then stop before the point gets buried.",
      "What is the one thing you want this post to help someone do?",
      "#personalbrand #contentplanning",
    ].join("\n\n")
    mocks.generateText.mockResolvedValue({ text: safeCaption })

    const { generateInstagramCaption } = await import("@/lib/feed-planner/caption-writer")
    await generateInstagramCaption({
      postPosition: 3,
      shotType: "portrait",
      purpose: "content planning",
      emotionalTone: "calm",
      brandProfile: { business_type: "creative educator" },
      targetAudience: "women building a personal brand",
      brandVoice: "warm and direct",
      captionType: "value",
      imageContext: "A quiet close portrait by a dark window with a reflective editorial mood.",
    })

    const request = mocks.generateText.mock.calls[0]?.[0]
    expect(request.prompt).toContain("## SELECTED PHOTO CONTEXT")
    expect(request.prompt).toContain("quiet close portrait by a dark window")
    expect(request.messages).toBeUndefined()
    expect(mocks.generateText).toHaveBeenCalledTimes(1)
  })
})
