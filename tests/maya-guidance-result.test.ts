// @vitest-environment node

import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  buildMayaGuidanceLimitation,
  buildMayaGuidanceResult,
} from "@/lib/app-v3/maya/guidance/service"
import type { MayaGuidanceSource } from "@/lib/app-v3/maya/guidance/source-registry"

const sources: MayaGuidanceSource[] = [
  {
    id: "lesson:10:maya_context:0",
    kind: "lesson",
    title: "Post Before You Feel Ready",
    text: "Confidence is built by showing up before everything feels perfect.",
    version: "1234567890abcdef",
    courseId: 1,
    lessonId: 10,
    productId: "branded_by_sselfie",
    field: "maya_context",
  },
  {
    id: "lesson:10:action_step:0",
    kind: "lesson",
    title: "Post Before You Feel Ready",
    text: "Publish one useful post this week.",
    version: "abcdef1234567890",
    courseId: 1,
    lessonId: 10,
    productId: "branded_by_sselfie",
    field: "action_step",
  },
]

describe("Maya guidance result contract", () => {
  it("returns source-backed guidance and a Phase 2 continue action", () => {
    const result = buildMayaGuidanceResult({
      request: {
        taskId: "maya-task-learning-123",
        job: "learn_next",
        question: "How do I start posting?",
      },
      sources,
      modelOutput: {
        recommendation: "Publish one useful post before you wait for confidence.",
        reason: "Sandra teaches that confidence is created through showing up.",
        sourceIds: [sources[0].id, "not-a-real-source"],
      },
    })

    expect(result.sourceRefs).toEqual([
      expect.objectContaining({ kind: "lesson", courseId: 1, lessonId: 10 }),
    ])
    expect(result.nextAction.kind).toBe("continue_lesson")
    expect(result.nextAction.target).toEqual({ lessonId: 10 })
    expect(result.nextAction.creditCost).toBe(0)
    expect(result.nextAction.taskId).toBe("maya-task-learning-123")
  })

  it("answers an unknown question honestly without inventing a teaching claim", () => {
    const result = buildMayaGuidanceLimitation({
      request: {
        taskId: "maya-task-learning-999",
        job: "learn_next",
        question: "Which legal structure should my company use?",
      },
      safestSource: sources[0],
    })

    expect(result.recommendation).toMatch(/don.t have enough Sandra teaching/i)
    expect(result.sourceRefs).toHaveLength(1)
    expect(result.nextAction.kind).toBe("continue_lesson")
  })
})
