import "server-only"

import { generateText, Output } from "ai"
import { z } from "zod"

import {
  createMayaAction,
  mayaActionIdempotencyKey,
  type MayaActionKind,
} from "@/lib/app-v3/maya/action-protocol"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"
import type { MayaGuidanceSource } from "./source-registry"
import type { MayaGuidanceRequest, MayaGuidanceResult } from "./types"

export const mayaGuidanceModelOutputSchema = z.object({
  recommendation: z.string().min(1).max(320),
  reason: z.string().min(1).max(320),
  sourceIds: z.array(z.string().min(1).max(160)).min(1).max(4),
})

export type MayaGuidanceModelOutput = z.infer<typeof mayaGuidanceModelOutputSchema>

type MayaGuidanceErrorTelemetry = {
  statusCode?: number
  isRetryable?: boolean
  providerErrorCode?: string
  providerErrorType?: string
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function safeProviderField(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined
  return (
    String(value)
      .replace(/[^a-zA-Z0-9_.-]/g, "_")
      .slice(0, 80) || undefined
  )
}

export function getMayaGuidanceErrorTelemetry(error: unknown): MayaGuidanceErrorTelemetry {
  const details = recordValue(error)
  if (!details) return {}
  let responseBody: Record<string, unknown> | null = null
  if (typeof details.responseBody === "string") {
    try {
      responseBody = recordValue(JSON.parse(details.responseBody))
    } catch {
      responseBody = null
    }
  }
  const providerError = recordValue(responseBody?.error) ?? responseBody
  return {
    ...(typeof details.statusCode === "number" ? { statusCode: details.statusCode } : {}),
    ...(typeof details.isRetryable === "boolean" ? { isRetryable: details.isRetryable } : {}),
    ...(safeProviderField(providerError?.code)
      ? { providerErrorCode: safeProviderField(providerError?.code) }
      : {}),
    ...(safeProviderField(providerError?.type)
      ? { providerErrorType: safeProviderField(providerError?.type) }
      : {}),
  }
}

function clipped(value: string, maxLength: number): string {
  const clean = value.replace(/\s+/g, " ").trim()
  return clean.slice(0, maxLength)
}

function selectedSources(
  sources: MayaGuidanceSource[],
  sourceIds: string[],
  requireLesson: boolean
): MayaGuidanceSource[] {
  const requested = new Set(sourceIds)
  const selected = sources.filter(source => requested.has(source.id)).slice(0, 4)
  const result = selected.length ? selected : sources.slice(0, 1)
  const lesson = requireLesson ? sources.find(source => source.lessonId) : undefined
  if (!lesson || result.some(source => source.id === lesson.id)) return result
  return [lesson, ...result].slice(0, 4)
}

function actionKindFor(
  request: MayaGuidanceRequest,
  sources: MayaGuidanceSource[]
): MayaActionKind {
  if (sources.some(source => source.lessonId)) return "continue_lesson"
  if (request.job === "decide_post") return "create_caption"
  if (request.job === "improve_grid") return "update_grid"
  return "continue_lesson"
}

function buildNextAction(
  request: MayaGuidanceRequest,
  sources: MayaGuidanceSource[],
  reason: string
) {
  const lesson = sources.find(source => source.lessonId)
  const kind = actionKindFor(request, sources)
  const key = mayaActionIdempotencyKey(
    request.taskId,
    "guidance",
    kind,
    lesson?.courseId,
    lesson?.lessonId,
    ...sources.map(source => source.version)
  )
  const title = lesson
    ? `Continue with ${lesson.title}`
    : request.job === "decide_post"
      ? "Turn this into your next post"
      : request.job === "improve_grid"
        ? "Use this to improve your grid"
        : "Continue with Sandra's method"

  return createMayaAction({
    id: `guidance-${key}`,
    taskId: request.taskId,
    kind,
    title,
    reason: clipped(reason, 320),
    ...(lesson?.lessonId ? { target: { lessonId: lesson.lessonId } } : {}),
    creditCost: 0,
    requiresConfirmation: false,
    canUndo: false,
    idempotencyKey: key,
  })
}

export function buildMayaGuidanceResult(input: {
  request: MayaGuidanceRequest
  sources: MayaGuidanceSource[]
  modelOutput: MayaGuidanceModelOutput
}): MayaGuidanceResult {
  if (!input.sources.length) throw new Error("Maya guidance requires at least one source")
  const sources = selectedSources(
    input.sources,
    input.modelOutput.sourceIds,
    input.request.job === "learn_next"
  )
  const reason = clipped(input.modelOutput.reason, 320)
  return {
    recommendation: clipped(input.modelOutput.recommendation, 320),
    reason,
    sourceRefs: sources.map(source => ({
      kind: source.kind,
      ...(source.courseId ? { courseId: source.courseId } : {}),
      ...(source.lessonId ? { lessonId: source.lessonId } : {}),
      title: source.title,
      version: source.version,
    })),
    nextAction: buildNextAction(input.request, sources, reason),
  }
}

export function buildMayaGuidanceLimitation(input: {
  request: MayaGuidanceRequest
  safestSource: MayaGuidanceSource
}): MayaGuidanceResult {
  const recommendation =
    "I don't have enough Sandra teaching on that specific question to answer it honestly. Start with the closest proven SSELFIE step instead."
  const reason = "This keeps Maya inside Sandra's approved method instead of inventing advice."
  return buildMayaGuidanceResult({
    request: input.request,
    sources: [input.safestSource],
    modelOutput: {
      recommendation,
      reason,
      sourceIds: [input.safestSource.id],
    },
  })
}

function deterministicFallback(
  request: MayaGuidanceRequest,
  sources: MayaGuidanceSource[]
): MayaGuidanceResult {
  const primarySource = sources[0]
  const sameLessonSources = primarySource.lessonId
    ? sources.filter(source => source.lessonId === primarySource.lessonId)
    : sources
  const source =
    sameLessonSources.find(source => source.field === "action_step") ??
    sameLessonSources.find(source => source.field === "curated_transcript") ??
    sameLessonSources.find(source => source.field !== "maya_context") ??
    primarySource
  const recommendation = memberFacingFallbackText(source.text)
  return buildMayaGuidanceResult({
    request,
    sources,
    modelOutput: {
      recommendation,
      reason: `This is the closest next step in ${source.title}.`,
      sourceIds: [source.id],
    },
  })
}

function memberFacingFallbackText(value: string): string {
  const instructionPrefix =
    /^(?:help|guide|encourage|ask|teach|support|show)\s+(?:the\s+)?(?:user|member|student)\s+(?:to\s+)?/i
  const cleaned = clipped(value, 280)
    .replace(instructionPrefix, "")
    .replace(/\bher\b/gi, "your")
    .replace(/\bshe\b/gi, "you")
    .trim()
  return cleaned
    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    : "Choose one useful next step."
}

export async function generateMayaGuidance(input: {
  request: MayaGuidanceRequest
  sources: MayaGuidanceSource[]
  hasQuestionMatch: boolean
  userId: string
}): Promise<MayaGuidanceResult> {
  if (!input.sources.length) throw new Error("No Maya guidance sources are available")
  if (input.request.question && !input.hasQuestionMatch) {
    return buildMayaGuidanceLimitation({
      request: input.request,
      safestSource: input.sources[0],
    })
  }

  const system = [
    "You are the non-creative Sandra guidance capability inside SSELFIE.",
    "Use only the supplied teaching fragments. Do not add general internet advice or unsupported claims.",
    "Return one practical recommendation, one short reason, and the IDs of the fragments that support the answer.",
    "Prefer one useful action over a list. If the fragments do not support the question, say that clearly.",
    "You cannot create images, spend credits, modify Calendar data, publish, or call any tool.",
    "Keep the answer warm, direct, and concise. Do not use an em dash.",
  ].join("\n")
  const fragmentText = input.sources
    .map(source => `[${source.id}] ${source.title}\n${source.text}`)
    .join("\n\n")
  const prompt = [
    `Active job: ${input.request.job}`,
    input.request.memberGoal ? `Member goal: ${input.request.memberGoal}` : "",
    input.request.question ? `Question: ${input.request.question}` : "",
    `Teaching fragments:\n${fragmentText}`,
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    const { output } = await generateText({
      model: createMayaOpenRouterModel("chat_default", {
        userId: input.userId,
        feature: "maya_guidance",
      }),
      output: Output.object({ schema: mayaGuidanceModelOutputSchema }),
      system,
      prompt,
      temperature: 0.2,
      maxOutputTokens: 500,
    })
    return buildMayaGuidanceResult({
      request: input.request,
      sources: input.sources,
      modelOutput: output,
    })
  } catch (error) {
    console.error("[maya-guidance] model output unavailable", {
      errorType: error instanceof Error ? error.name : "unknown",
      ...getMayaGuidanceErrorTelemetry(error),
    })
    return deterministicFallback(input.request, input.sources)
  }
}
