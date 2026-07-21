import type { LanguageModelMiddleware } from "ai"

export type MayaAiUsageContext = {
  userId?: string | number | null
  feature?: string
  metadata?: Record<string, string | number | boolean | null>
}

type UsageLike = {
  inputTokens?: number | { total?: number; noCache?: number; cacheRead?: number; cacheWrite?: number }
  inputTokenDetails?: {
    noCacheTokens?: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
  }
  outputTokens?: number | { total?: number; text?: number; reasoning?: number }
  outputTokenDetails?: { textTokens?: number; reasoningTokens?: number }
  totalTokens?: number
}

export type NormalizedMayaUsage = {
  inputTokens: number
  noCacheTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  reasoningTokens: number
  totalTokens: number
}

function safeTokenCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0
}

export function normalizeMayaUsage(usage: UsageLike | null | undefined): NormalizedMayaUsage {
  const inputObject =
    usage?.inputTokens && typeof usage.inputTokens === "object" ? usage.inputTokens : null
  const outputObject =
    usage?.outputTokens && typeof usage.outputTokens === "object" ? usage.outputTokens : null
  const inputTokens = safeTokenCount(
    typeof usage?.inputTokens === "number" ? usage.inputTokens : inputObject?.total
  )
  const outputTokens = safeTokenCount(
    typeof usage?.outputTokens === "number" ? usage.outputTokens : outputObject?.total
  )
  const cacheReadTokens = safeTokenCount(
    inputObject?.cacheRead ?? usage?.inputTokenDetails?.cacheReadTokens
  )
  const cacheWriteTokens = safeTokenCount(
    inputObject?.cacheWrite ?? usage?.inputTokenDetails?.cacheWriteTokens
  )
  const explicitNoCacheTokens =
    inputObject?.noCache ?? usage?.inputTokenDetails?.noCacheTokens
  const noCacheTokens =
    explicitNoCacheTokens == null
      ? Math.max(0, inputTokens - cacheReadTokens - cacheWriteTokens)
      : safeTokenCount(explicitNoCacheTokens)

  return {
    inputTokens,
    noCacheTokens,
    cacheReadTokens,
    cacheWriteTokens,
    outputTokens,
    reasoningTokens: safeTokenCount(
      outputObject?.reasoning ?? usage?.outputTokenDetails?.reasoningTokens
    ),
    totalTokens: safeTokenCount(usage?.totalTokens) || inputTokens + outputTokens,
  }
}

type ModelRates = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

function getModelRates(modelId: string): ModelRates {
  const normalized = modelId.toLowerCase()
  if (normalized.includes("haiku-4.5") || normalized.includes("haiku-4-5")) {
    return { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 }
  }
  if (normalized.includes("sonnet-4-6")) {
    return { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 }
  }
  if (normalized.includes("gpt-4o-mini")) {
    return { input: 0.15, output: 0.6, cacheRead: 0.075, cacheWrite: 0.15 }
  }
  return { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 }
}

export function estimateMayaTextCostUsd(
  modelId: string,
  usage: NormalizedMayaUsage
): number {
  const rates = getModelRates(modelId)
  const detailedInput =
    usage.noCacheTokens + usage.cacheReadTokens + usage.cacheWriteTokens
  const uncachedInput = detailedInput > 0 ? usage.noCacheTokens : usage.inputTokens
  const cost =
    uncachedInput * rates.input +
    usage.cacheReadTokens * rates.cacheRead +
    usage.cacheWriteTokens * rates.cacheWrite +
    usage.outputTokens * rates.output
  return cost / 1_000_000
}

type PersistInput = {
  userId: string | null
  feature: string
  task: string
  provider: string
  model: string
  generationId: string | null
  usage: NormalizedMayaUsage
  finishReason: string | null
  status: "ok" | "error"
  errorCode: string | null
  durationMs: number
  requestChars: number
  metadata: Record<string, string | number | boolean | null>
}

let tableReady: Promise<void> | null = null

async function ensureUsageTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const { sql } = await import("@/lib/db/client")
      await sql`
        CREATE TABLE IF NOT EXISTS maya_ai_usage_events (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT,
          feature TEXT NOT NULL,
          task TEXT NOT NULL,
          provider TEXT NOT NULL,
          model TEXT NOT NULL,
          generation_id TEXT,
          input_tokens INTEGER NOT NULL DEFAULT 0,
          no_cache_input_tokens INTEGER NOT NULL DEFAULT 0,
          cache_read_tokens INTEGER NOT NULL DEFAULT 0,
          cache_write_tokens INTEGER NOT NULL DEFAULT 0,
          output_tokens INTEGER NOT NULL DEFAULT 0,
          reasoning_tokens INTEGER NOT NULL DEFAULT 0,
          total_tokens INTEGER NOT NULL DEFAULT 0,
          provider_cost_usd NUMERIC(12, 6),
          estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
          finish_reason TEXT,
          status TEXT NOT NULL,
          error_code TEXT,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          request_chars INTEGER NOT NULL DEFAULT 0,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_ai_usage_feature_created ON maya_ai_usage_events(feature, created_at DESC)`
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_ai_usage_user_created ON maya_ai_usage_events(user_id, created_at DESC)`
    })().catch(error => {
      tableReady = null
      throw error
    })
  }
  return tableReady
}

async function getOpenRouterCost(generationId: string | null): Promise<number | null> {
  if (!generationId || !process.env.OPENROUTER_API_KEY) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(
      `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`,
      {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeout))
    if (!response.ok) return null
    const payload = (await response.json()) as { data?: { total_cost?: unknown } }
    return typeof payload.data?.total_cost === "number" ? payload.data.total_cost : null
  } catch {
    return null
  }
}

async function persistUsage(input: PersistInput): Promise<void> {
  try {
    await ensureUsageTable()
    const { sql } = await import("@/lib/db/client")
    const providerCost =
      input.provider === "openrouter" ? await getOpenRouterCost(input.generationId) : null
    const estimatedCost = estimateMayaTextCostUsd(input.model, input.usage)
    await sql`
      INSERT INTO maya_ai_usage_events (
        user_id, feature, task, provider, model, generation_id,
        input_tokens, no_cache_input_tokens, cache_read_tokens, cache_write_tokens,
        output_tokens, reasoning_tokens, total_tokens, provider_cost_usd,
        estimated_cost_usd, finish_reason, status, error_code, duration_ms,
        request_chars, metadata
      ) VALUES (
        ${input.userId}, ${input.feature}, ${input.task}, ${input.provider}, ${input.model},
        ${input.generationId}, ${input.usage.inputTokens}, ${input.usage.noCacheTokens},
        ${input.usage.cacheReadTokens}, ${input.usage.cacheWriteTokens},
        ${input.usage.outputTokens}, ${input.usage.reasoningTokens}, ${input.usage.totalTokens},
        ${providerCost}, ${estimatedCost}, ${input.finishReason}, ${input.status},
        ${input.errorCode}, ${input.durationMs}, ${input.requestChars},
        ${JSON.stringify(input.metadata)}::jsonb
      )
    `
  } catch (error) {
    console.warn("[maya-ai-usage] logging skipped:", error)
  }
}

function serializedLength(value: unknown): number {
  try {
    return JSON.stringify(value).length
  } catch {
    return 0
  }
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) return String(error.code)
  return error instanceof Error ? error.name : "unknown"
}

function finishReasonValue(value: unknown): string | null {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && "unified" in value) {
    return typeof value.unified === "string" ? value.unified : null
  }
  return null
}

export function createMayaAiUsageMiddleware(input: {
  task: string
  provider: "openrouter" | "anthropic"
  model: string
  context?: MayaAiUsageContext
}): LanguageModelMiddleware {
  const base = {
    userId: input.context?.userId == null ? null : String(input.context.userId),
    feature: input.context?.feature || input.task,
    task: input.task,
    provider: input.provider,
    model: input.model,
    metadata: input.context?.metadata || {},
  }

  return {
    specificationVersion: "v3",
    wrapGenerate: async ({ doGenerate, params }) => {
      const startedAt = Date.now()
      try {
        const result = await doGenerate()
        await persistUsage({
          ...base,
          generationId: result.response?.id || null,
          usage: normalizeMayaUsage(result.usage),
          finishReason: finishReasonValue(result.finishReason),
          status: "ok",
          errorCode: null,
          durationMs: Date.now() - startedAt,
          requestChars: serializedLength(params.prompt),
        })
        return result
      } catch (error) {
        await persistUsage({
          ...base,
          generationId: null,
          usage: normalizeMayaUsage(null),
          finishReason: null,
          status: "error",
          errorCode: errorCode(error),
          durationMs: Date.now() - startedAt,
          requestChars: serializedLength(params.prompt),
        })
        throw error
      }
    },
    wrapStream: async ({ doStream, params }) => {
      const startedAt = Date.now()
      try {
        const result = await doStream()
        let generationId: string | null = null
        let logged = false
        const stream = result.stream.pipeThrough(
          new TransformStream({
            async transform(part, controller) {
              if (part.type === "response-metadata") generationId = part.id || null
              if (part.type === "finish" && !logged) {
                logged = true
                await persistUsage({
                  ...base,
                  generationId,
                  usage: normalizeMayaUsage(part.usage),
                  finishReason: finishReasonValue(part.finishReason),
                  status: "ok",
                  errorCode: null,
                  durationMs: Date.now() - startedAt,
                  requestChars: serializedLength(params.prompt),
                })
              }
              controller.enqueue(part)
            },
          })
        )
        return { ...result, stream }
      } catch (error) {
        await persistUsage({
          ...base,
          generationId: null,
          usage: normalizeMayaUsage(null),
          finishReason: null,
          status: "error",
          errorCode: errorCode(error),
          durationMs: Date.now() - startedAt,
          requestChars: serializedLength(params.prompt),
        })
        throw error
      }
    },
  }
}
