// @vitest-environment node

import { describe, expect, it, vi } from "vitest"
import { zodToJsonSchema } from "zod-to-json-schema"

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("ai", () => ({
  generateText: mocks.generateText,
  Output: { object: vi.fn(() => ({})) },
}))
vi.mock("@/lib/maya/openrouter", () => ({
  createMayaOpenRouterModel: vi.fn(() => "maya-guidance-model"),
}))

import {
  buildMayaGuidanceLimitation,
  buildMayaGuidanceResult,
  generateMayaGuidance,
  getMayaGuidanceErrorTelemetry,
  mayaGuidanceProviderOutputSchema,
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
  it("uses a provider-compatible structured-output schema", () => {
    const providerJsonSchema = JSON.stringify(zodToJsonSchema(mayaGuidanceProviderOutputSchema))

    expect(providerJsonSchema).not.toMatch(/minLength|maxLength|minItems|maxItems/)
  })

  it("records only privacy-safe provider error metadata", () => {
    const details = getMayaGuidanceErrorTelemetry({
      statusCode: 401,
      isRetryable: false,
      responseBody: JSON.stringify({
        error: { code: "invalid_api_key", type: "authentication_error" },
      }),
      requestBodyValues: { prompt: "private member question" },
      apiKey: "must-never-be-logged",
    })

    expect(details).toEqual({
      statusCode: 401,
      isRetryable: false,
      providerErrorCode: "invalid_api_key",
      providerErrorType: "authentication_error",
    })
    expect(JSON.stringify(details)).not.toMatch(/private member question|must-never-be-logged/)
  })

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

  it("keeps the owned lesson citation when the model selects only a method fragment", () => {
    const methodSource: MayaGuidanceSource = {
      id: "method:belief:0",
      kind: "method",
      title: "Sandra's SSELFIE method",
      text: "Visibility grows through clear, useful action.",
      version: "method1234567890",
      field: "belief",
    }
    const result = buildMayaGuidanceResult({
      request: { taskId: "maya-task-learning-method", job: "learn_next" },
      sources: [sources[0], methodSource],
      modelOutput: {
        recommendation: "Use one clear teaching point in your next post.",
        reason: "This is the closest useful step.",
        sourceIds: [methodSource.id],
      },
    })

    expect(result.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "lesson", courseId: 1, lessonId: 10 }),
        expect.objectContaining({ kind: "method" }),
      ])
    )
    expect(result.nextAction.target).toEqual({ lessonId: 10 })
  })

  it("never leaks internal lesson instructions when the guidance model is unavailable", async () => {
    mocks.generateText.mockRejectedValueOnce(new Error("provider unavailable"))
    const internalLessonSource: MayaGuidanceSource = {
      id: "lesson:12:maya_context:0",
      kind: "lesson",
      title: "The Selfie CEO Shooting System",
      text: "Help the user plan a quick selfie shoot using her space, lighting, settings, pose, and intended use for the photos.",
      version: "internal123456789",
      courseId: 1,
      lessonId: 12,
      productId: "branded_by_sselfie",
      field: "maya_context",
    }

    const result = await generateMayaGuidance({
      request: {
        taskId: "maya-task-photos-no-plan",
        job: "learn_next",
        memberGoal: "I have photos but no plan",
      },
      sources: [internalLessonSource],
      hasQuestionMatch: true,
      userId: "qa-user",
    })

    expect(result.recommendation).toBe(
      "Plan a quick selfie shoot using your space, lighting, settings, pose, and intended use for the photos."
    )
    expect(result.recommendation).not.toMatch(/help the user/i)
    expect(result.sourceRefs).toEqual([expect.objectContaining({ courseId: 1, lessonId: 12 })])
  })

  it("rejects invalid provider output before building member guidance", async () => {
    mocks.generateText.mockResolvedValueOnce({
      output: { recommendation: "", reason: "", sourceIds: [] },
    })

    const result = await generateMayaGuidance({
      request: {
        taskId: "maya-task-invalid-provider-output",
        job: "learn_next",
        memberGoal: "I have photos but no plan",
      },
      sources,
      hasQuestionMatch: true,
      userId: "qa-user",
    })

    expect(result.recommendation).toBe("Publish one useful post this week.")
    expect(result.recommendation).not.toBe("")
  })
})
