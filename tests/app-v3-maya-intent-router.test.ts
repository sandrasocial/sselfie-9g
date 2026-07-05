import { describe, expect, it } from "vitest"

import {
  detectCreationIntent,
  intentForFormat,
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
