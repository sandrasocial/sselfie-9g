import { describe, expect, it } from "vitest"

import {
  detectCreationIntent,
  intentForFormat,
  memberDelegatesFormatChoice,
  needsClarificationIntent,
} from "@/lib/app-v3/maya/intent-router"

describe("app-v3 Maya intent router", () => {
  it("routes exact format phrases without waiting for the model to guess", () => {
    expect(detectCreationIntent("I need a profile photo").format).toBe("photo")
    expect(detectCreationIntent("create a full photoshoot").format).toBe("photoshoot")
    expect(detectCreationIntent("make a reel cover").format).toBe("reel-cover")
    expect(detectCreationIntent("turn this into a carousel").format).toBe("carousel")
    expect(detectCreationIntent("make one story slide").format).toBe("story-slide")
    expect(detectCreationIntent("build a story sequence").format).toBe("story-sequence")
    expect(detectCreationIntent("animate this photo").format).toBe("video")
  })

  it("routes fuzzy everyday phrases", () => {
    expect(detectCreationIntent("I want a headshot for my bio").format).toBe("photo")
    expect(detectCreationIntent("I want a series in one vibe").format).toBe("photoshoot")
    expect(detectCreationIntent("teach this idea in slides").format).toBe("carousel")
    expect(detectCreationIntent("make it move").format).toBe("video")
  })

  it("asks one clarifying question when the request conflicts", () => {
    const intent = detectCreationIntent("make a photo and a carousel from this")
    expect(intent.format).toBeNull()
    expect(intent.confidence).toBe("needs_clarify")
  })

  it("does not pretend unknown requests are photos", () => {
    expect(detectCreationIntent("I need help").format).toBeNull()
    expect(detectCreationIntent("I need help").confidence).toBe("needs_clarify")
  })

  it("keeps questions and advice about formats in Maya's neutral conversation", () => {
    for (const question of [
      "Can you explain why this photo feels off?",
      "What makes a carousel work well?",
      "Help me think through whether video is right for this launch",
    ]) {
      const intent = detectCreationIntent(question)
      expect(intent.format).toBeNull()
      expect(intent.confidence).toBe("needs_clarify")
    }

    expect(detectCreationIntent("Can you create a photo for this launch?").format).toBe("photo")
    expect(detectCreationIntent("Create a three-slide visibility carousel").format).toBe("carousel")
  })

  it("recognizes when the member explicitly asks Maya to choose the format", () => {
    expect(memberDelegatesFormatChoice("I don't know what to post. Maya, choose for me.")).toBe(
      true
    )
    expect(memberDelegatesFormatChoice("Surprise me with what works best today.")).toBe(true)
    expect(memberDelegatesFormatChoice("I want a carousel, but help me with the topic.")).toBe(
      false
    )
  })

  it("creates explicit intents for buttons and starter chips", () => {
    expect(intentForFormat("carousel", "starter_chip")).toEqual({
      format: "carousel",
      source: "starter_chip",
      confidence: "high",
    })
    expect(needsClarificationIntent("manual")).toEqual({
      format: null,
      source: "manual",
      confidence: "needs_clarify",
    })
  })
})
