import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { isFeedPlannerChatType } from "@/lib/maya/chat-type"

export type MayaRoutingTask =
  | "chat_default"
  | "chat_pro"
  | "prompt_builder"
  | "feed_planner"
  | "pro_photoshoot"
  | "feed_prompt"
  | "feed_prompt_locked_aesthetic"
  | "feed_prompt_batch"
  | "feed_strategy_document"
  | "feed_highlights"
  | "feed_highlight_overlay"
  | "feed_profile_design"
  | "feed_add_row"
  | "feed_enhance_caption"
  | "feed_enhance_goal"
  | "instagram_strategy"
  | "instagram_caption"
  | "instagram_bio"
  | "instagram_tips"

const TASK_MODEL_MAP: Record<MayaRoutingTask, string> = {
  chat_default: "anthropic/claude-haiku-4.5",
  chat_pro: "anthropic/claude-sonnet-5",
  prompt_builder: "anthropic/claude-sonnet-5",
  feed_planner: "anthropic/claude-sonnet-5",
  pro_photoshoot: "anthropic/claude-sonnet-5",
  feed_prompt: "anthropic/claude-sonnet-5",
  feed_prompt_locked_aesthetic: "anthropic/claude-sonnet-5",
  feed_prompt_batch: "anthropic/claude-sonnet-5",
  feed_strategy_document: "anthropic/claude-sonnet-5",
  feed_highlights: "anthropic/claude-sonnet-5",
  feed_highlight_overlay: "anthropic/claude-haiku-4.5",
  feed_profile_design: "anthropic/claude-sonnet-5",
  feed_add_row: "anthropic/claude-sonnet-5",
  feed_enhance_caption: "anthropic/claude-haiku-4.5",
  feed_enhance_goal: "anthropic/claude-haiku-4.5",
  instagram_strategy: "anthropic/claude-haiku-4.5",
  instagram_caption: "anthropic/claude-sonnet-5",
  instagram_bio: "anthropic/claude-haiku-4.5",
  instagram_tips: "openai/gpt-4o-mini",
}

const TASK_MAX_TOKENS_MAP: Record<MayaRoutingTask, number> = {
  chat_default: 4096,
  chat_pro: 4096,
  prompt_builder: 4096,
  feed_planner: 8192,
  pro_photoshoot: 4096,
  feed_prompt: 4096,
  feed_prompt_locked_aesthetic: 4096,
  feed_prompt_batch: 4096,
  feed_strategy_document: 4096,
  feed_highlights: 4096,
  feed_highlight_overlay: 256,
  feed_profile_design: 2048,
  feed_add_row: 2048,
  feed_enhance_caption: 2048,
  feed_enhance_goal: 1024,
  instagram_strategy: 4096,
  instagram_caption: 2000,
  instagram_bio: 1000,
  instagram_tips: 1200,
}

export const MAYA_REASONING_DISABLED = {
  openrouter: { enabled: false },
  anthropic: { type: "disabled" },
} as const

type MayaReasoningProvider = keyof typeof MAYA_REASONING_DISABLED

/**
 * Sonnet 5 may default to adaptive thinking when the setting is omitted. Maya's tool-heavy
 * chat contract needs the full output budget for visible text and structured tool calls, so
 * every provider request disables thinking explicitly. Kept pure for the golden regression.
 */
export function applyMayaReasoningDisabled(
  body: unknown,
  provider: MayaReasoningProvider
): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body
  return provider === "openrouter"
    ? { ...body, reasoning: MAYA_REASONING_DISABLED.openrouter }
    : { ...body, thinking: MAYA_REASONING_DISABLED.anthropic }
}

function createMayaReasoningDisabledFetch(provider: MayaReasoningProvider): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof init?.body !== "string") return fetch(input, init)
    try {
      const body = applyMayaReasoningDisabled(JSON.parse(init.body), provider)
      return fetch(input, { ...init, body: JSON.stringify(body) })
    } catch {
      return fetch(input, init)
    }
  }) as typeof fetch
}

export function getMayaModelForTask(task: MayaRoutingTask): string {
  return TASK_MODEL_MAP[task]
}

export function getMayaMaxTokensForTask(task: MayaRoutingTask): number {
  return TASK_MAX_TOKENS_MAP[task]
}

export function getMayaRoutingSnapshot() {
  return {
    modelByTask: { ...TASK_MODEL_MAP },
    maxOutputTokensByTask: { ...TASK_MAX_TOKENS_MAP },
    reasoningDisabled: MAYA_REASONING_DISABLED,
  }
}

function isTruthy(value?: string | null): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

export function isMayaOpenRouterPrimaryEnabled(envValue?: string | null): boolean {
  const resolved = envValue !== undefined ? envValue : process.env.FEATURE_MAYA_OPENROUTER_PRIMARY
  if (resolved === undefined || resolved === null || resolved.trim() === "") {
    return true
  }
  return isTruthy(resolved)
}

export function resolveMayaChatTask(input: {
  chatType: string
  isPromptBuilder: boolean
  isStudioProMode: boolean
  preferFeedPlannerContext?: boolean
}): MayaRoutingTask {
  if (input.isPromptBuilder || input.chatType === "prompt_builder") return "prompt_builder"
  if (input.preferFeedPlannerContext) return "feed_planner"
  if (isFeedPlannerChatType(input.chatType)) return "feed_planner"
  if (input.chatType === "pro-photoshoot") return "pro_photoshoot"
  if (input.isStudioProMode) return "chat_pro"
  return "chat_default"
}

// Maps OpenRouter model IDs to direct Anthropic API model IDs.
// Used when OpenRouter is unavailable — ensures Maya always has a working fallback.
const OPENROUTER_TO_ANTHROPIC_ID: Record<string, string> = {
  "anthropic/claude-haiku-4.5": "claude-haiku-4-5-20251001",
  // Sonnet 5 rejects the non-default temperature used by existing Maya callers on the direct
  // Anthropic API. Sonnet 4.6 is current, live-verified, and preserves the emergency fallback.
  "anthropic/claude-sonnet-5": "claude-sonnet-4-6",
  "openai/gpt-4o-mini": "claude-haiku-4-5-20251001", // fast/cheap equivalent
}

export function createMayaOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing. Maya requires OpenRouter for model routing.")
  }

  return createOpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    fetch: createMayaReasoningDisabledFetch("openrouter"),
    headers: {
      "HTTP-Referer":
        process.env.OPENROUTER_HTTP_REFERER ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://sselfie.ai",
      "X-Title": process.env.OPENROUTER_APP_NAME || "SSELFIE Maya",
    },
  })
}

export function getMayaGatewayModel(task: MayaRoutingTask): string {
  return getMayaModelForTask(task)
}

/**
 * Creates a model via direct Anthropic API (@ai-sdk/anthropic).
 * Used as a true fallback when OpenRouter is unavailable.
 * Returns null if ANTHROPIC_API_KEY is missing.
 */
export function createMayaAnthropicModel(task: MayaRoutingTask) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return null
    const openRouterModelId = getMayaModelForTask(task)
    const anthropicModelId =
      OPENROUTER_TO_ANTHROPIC_ID[openRouterModelId] ?? "claude-haiku-4-5-20251001"
    return createAnthropic({
      apiKey,
      fetch: createMayaReasoningDisabledFetch("anthropic"),
    })(anthropicModelId)
  } catch {
    return null
  }
}

export function createMayaOpenRouterFallbackModel(task: MayaRoutingTask) {
  try {
    const provider = createMayaOpenRouterProvider()
    // CRITICAL: Must use .chat() — OpenRouter supports Chat Completions only.
    // In @ai-sdk/openai@3.x, calling provider(modelId) creates an
    // OpenAIResponsesLanguageModel which POSTs to /v1/responses — an endpoint
    // OpenRouter does not implement. This causes "Invalid Responses API request"
    // on every Maya call. provider.chat() creates OpenAIChatLanguageModel
    // which uses the standard /v1/chat/completions endpoint.
    return provider.chat(getMayaModelForTask(task))
  } catch {
    return null
  }
}

/** Thrown when neither OpenRouter nor Anthropic can be constructed (never return a raw model id string). */
export const MAYA_LLM_NOT_CONFIGURED = "MAYA_LLM_NOT_CONFIGURED"

export function createMayaOpenRouterModel(task: MayaRoutingTask) {
  if (!isMayaOpenRouterPrimaryEnabled()) {
    const anthropic = createMayaAnthropicModel(task)
    if (anthropic) return anthropic
    const openRouterWhenPrimaryOff = createMayaOpenRouterFallbackModel(task)
    if (openRouterWhenPrimaryOff) return openRouterWhenPrimaryOff
    throw new Error(`${MAYA_LLM_NOT_CONFIGURED}: Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY.`)
  }

  const openRouterModel = createMayaOpenRouterFallbackModel(task)
  if (openRouterModel) return openRouterModel
  const anthropic = createMayaAnthropicModel(task)
  if (anthropic) return anthropic
  throw new Error(`${MAYA_LLM_NOT_CONFIGURED}: Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY.`)
}
