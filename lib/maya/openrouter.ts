import { createOpenAI } from "@ai-sdk/openai"
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
  chat_pro: "anthropic/claude-sonnet-4.5",
  prompt_builder: "anthropic/claude-sonnet-4.5",
  feed_planner: "anthropic/claude-sonnet-4.5",
  pro_photoshoot: "anthropic/claude-sonnet-4.5",
  feed_prompt: "anthropic/claude-sonnet-4.5",
  feed_prompt_locked_aesthetic: "anthropic/claude-sonnet-4.5",
  feed_prompt_batch: "anthropic/claude-sonnet-4.5",
  feed_strategy_document: "anthropic/claude-sonnet-4",
  feed_highlights: "anthropic/claude-sonnet-4",
  feed_highlight_overlay: "anthropic/claude-haiku-4.5",
  feed_profile_design: "anthropic/claude-sonnet-4",
  feed_add_row: "anthropic/claude-sonnet-4.5",
  feed_enhance_caption: "anthropic/claude-haiku-4.5",
  feed_enhance_goal: "anthropic/claude-haiku-4.5",
  instagram_strategy: "anthropic/claude-haiku-4.5",
  instagram_caption: "anthropic/claude-sonnet-4",
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

export function getMayaModelForTask(task: MayaRoutingTask): string {
  return TASK_MODEL_MAP[task]
}

export function getMayaMaxTokensForTask(task: MayaRoutingTask): number {
  return TASK_MAX_TOKENS_MAP[task]
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

export function createMayaOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing. Maya requires OpenRouter for model routing.")
  }

  return createOpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai",
      "X-Title": process.env.OPENROUTER_APP_NAME || "SSELFIE Maya",
    },
  })
}

export function getMayaGatewayModel(task: MayaRoutingTask): string {
  return getMayaModelForTask(task)
}

export function createMayaOpenRouterFallbackModel(task: MayaRoutingTask) {
  try {
    const provider = createMayaOpenRouterProvider()
    return provider(getMayaModelForTask(task))
  } catch {
    return null
  }
}

export function createMayaOpenRouterModel(task: MayaRoutingTask) {
  if (!isMayaOpenRouterPrimaryEnabled()) {
    return getMayaGatewayModel(task)
  }

  const openRouterModel = createMayaOpenRouterFallbackModel(task)
  if (openRouterModel) return openRouterModel
  return getMayaGatewayModel(task)
}
