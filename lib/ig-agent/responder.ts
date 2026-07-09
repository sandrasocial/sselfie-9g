import { generateText } from "ai"
import { z } from "zod"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"
import { buildContactContext } from "@/lib/ig-agent/contact-profiler"
import { IG_AGENT_PROMPT_VAULT_URL } from "@/lib/ig-agent/links"
import { buildSandraSystemPrompt } from "@/lib/ig-agent/voice-prompt"
import { detectGrowthTags } from "@/lib/ig-agent/triage"
import type { IgResponderResult } from "@/lib/ig-agent/types"
import { envFlag } from "@/lib/env-flags"

const DraftResponseSchema = z.object({
  response: z.string().min(1),
  confidence: z.number().min(0).max(1),
  intent: z.string().min(1).default("unknown"),
  shouldSend: z.boolean().default(false),
  growthTags: z.array(z.string()).default([]),
})

function stripJsonFence(value: string): string {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
}

function fallbackDraft(message: string): IgResponderResult {
  const isPrompt = /\bprompt/i.test(message)
  const isVault = /\bvault/i.test(message)
  const response = isVault
    ? `Ahhh yes babe 😭🫶🏼\n\nThe Vault is where I keep the full AI photoshoot prompts I've been obsessing over lately 👀✨\n\nYou can see it here:\n${IG_AGENT_PROMPT_VAULT_URL} 🤍`
    : isPrompt
      ? "Omg yes babe 😭✨\n\nYou can grab the free prompts here:\nhttps://sselfie.ai/ai-prompts\n\nStart with a clear selfie and just test one look first 👀🤍"
      : "Awww babe 😭🫶🏼\n\nI saw this and I'm saving it for Sandra to look at properly 🤍"

  return {
    response,
    confidence: isPrompt || isVault ? 0.82 : 0.55,
    intent: isVault ? "vault_interest" : isPrompt ? "prompt_request" : "needs_review",
    shouldSend: false,
    growthTags: detectGrowthTags(message),
  }
}

export async function generateSandraDraft(params: {
  igUserId: string
  latestMessage: string
  forceFallback?: boolean
}): Promise<IgResponderResult> {
  if (params.forceFallback || !envFlag("IG_AGENT_AI_DRAFTS_ENABLED", true)) {
    return fallbackDraft(params.latestMessage)
  }

  const contact = await buildContactContext(params.igUserId)
  const system = buildSandraSystemPrompt({ contact })

  try {
    // OpenRouter is the funded, primary Maya lane (see lib/maya/openrouter.ts) — it already
    // falls back to direct Anthropic internally if OpenRouter is unavailable. Calling direct
    // Anthropic first here bypassed that: createMayaAnthropicModel only checks that
    // ANTHROPIC_API_KEY is set, not that the account has credit, so a billing failure only
    // surfaced later inside generateText() and always landed on the canned fallbackDraft below.
    const model = createMayaOpenRouterModel("instagram_strategy")
    const { text } = await generateText({
      model,
      system,
      prompt: `Latest Instagram message:\n${params.latestMessage}\n\nDraft Sandra's reply as JSON only.`,
      temperature: 0.5,
      maxOutputTokens: 700,
    })

    const parsed = DraftResponseSchema.parse(JSON.parse(stripJsonFence(text)))
    const growthTags = Array.from(new Set([...detectGrowthTags(params.latestMessage), ...parsed.growthTags]))

    return {
      response: parsed.response,
      confidence: parsed.confidence,
      intent: parsed.intent,
      shouldSend: parsed.shouldSend && parsed.confidence >= 0.8,
      growthTags,
    }
  } catch (error) {
    console.warn("[ig-agent] Draft generation failed, using fallback:", error)
    return fallbackDraft(params.latestMessage)
  }
}
