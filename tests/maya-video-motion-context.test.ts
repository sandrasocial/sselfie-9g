import { describe, expect, it } from "vitest"
import {
  buildMayaMotionPromptInput,
  buildMayaMotionSnapshotContext,
  cleanGeneratedMotionPrompt,
} from "@/lib/maya/video-motion-context"
import type { MayaUserSnapshot } from "@/lib/maya/user-snapshot"

function createSnapshot(overrides: Partial<MayaUserSnapshot> = {}): MayaUserSnapshot {
  return {
    userId: "42",
    offerBrief: {
      prefill: {
        offerType: "Coaching",
        transformation: "Build a premium personal brand",
        idealClient: "Women founders",
        uniqueMethod: "Maya brand sprint",
      },
      missingFields: [],
      hasCoreFields: true,
    },
    uploads: {
      selfies: 4,
      products: 2,
      people: 0,
      vibes: 1,
      total: 7,
      hasAny: true,
    },
    generation: {
      hasTrainedModel: true,
      canUseCustomModel: true,
      canUseSelfies: true,
      recommendedSource: "custom_model",
    },
    activeAssetContext: null,
    memoryData: {
      user_preference_notes: ["Keep it cinematic", "No generic smiling"],
    },
    ...overrides,
  }
}

describe("maya video motion context", () => {
  it("builds snapshot context with uploads, offer summary, and preference notes", () => {
    const context = buildMayaMotionSnapshotContext(createSnapshot())
    expect(context).toContain("User has 7 saved visual assets")
    expect(context).toContain("Offer: Coaching")
    expect(context).toContain("Voice/style notes to respect")
  })

  it("builds motion prompt input using scene and snapshot context", () => {
    const input = buildMayaMotionPromptInput({
      fluxPrompt: "Luxury cafe portrait",
      description: "Soft and elegant",
      category: "lifestyle",
      imageUrl: "https://example.com/image.jpg",
      snapshot: createSnapshot(),
    })

    expect(input).toContain('Scene: "Luxury cafe portrait"')
    expect(input).toContain("Mood/intent: Soft and elegant")
    expect(input).toContain("Content category: lifestyle")
    expect(input).toContain("Reference image is provided")
    expect(input).toContain("Return a single line only")
  })

  it("cleans markdown wrappers from generated motion prompt", () => {
    const cleaned = cleanGeneratedMotionPrompt("**Motion:** Head turns gently toward the window, soft breeze lifts hair.")
    expect(cleaned).toBe("Head turns gently toward the window, soft breeze lifts hair.")
  })
})

