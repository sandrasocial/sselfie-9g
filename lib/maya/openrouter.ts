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

const TASK_MODEL_MAP: Record<MayaRoutingTask, string> = {
  chat_default: "anthropic/claude-haiku-4.5",
  chat_pro: "anthropic/claude-sonnet-4.5",
  prompt_builder: "anthropic/claude-sonnet-4.5",
  feed_planner: "anthropic/claude-sonnet-4.5",
  pro_photoshoot: "anthropic/claude-sonnet-4.5",
  feed_prompt: "anthropic/claude-sonnet-4.5",
  feed_prompt_locked_aesthetic: "anthropic/claude-sonnet-4.5",
  feed_prompt_batch: "anthropic/claude-sonnet-4.5",
}

export function getMayaModelForTask(task: MayaRoutingTask): string {
  return TASK_MODEL_MAP[task]
}

function isTruthy(value?: string | null): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

export function isMayaOpenRouterPrimaryEnabled(envValue?: string | null): boolean {
  if (envValue !== undefined) return isTruthy(envValue)
  return isTruthy(process.env.FEATURE_MAYA_OPENROUTER_PRIMARY)
}

export function resolveMayaChatTask(input: {
  chatType: string
  isPromptBuilder: boolean
  isStudioProMode: boolean
}): MayaRoutingTask {
  if (input.isPromptBuilder || input.chatType === "prompt_builder") return "prompt_builder"
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
