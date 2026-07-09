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

// Used ONLY when the real drafting call itself failed (LLM/network/parsing error) — a genuine
// AI failure, not a deliberate "AI drafts disabled" choice. Cross-industry escalation guidance
// (Replicant, CX Today — see docs/business/AI_COMMUNITY_MANAGEMENT_RESEARCH_2026-07-09.md) is
// consistent that an AI should self-escalate on its own detected failure rather than paper over
// it. The plain fallbackDraft() above was being used for this too, which was actively dangerous
// here: it can score 0.82 on a bare prompt/vault keyword match (above the 0.8 auto-flag
// threshold), so an infrastructure failure would silently sail through as a normal, unflagged
// reply — AND that same canned text pastes a raw prompt link directly, which breaks the
// documented "never paste prompt links yourself" rule. This variant always flags and never
// includes a raw link, regardless of what the message said.
function generationFailedDraft(message: string): IgResponderResult {
  return {
    response: "Awww babe 😭🫶🏼\n\nI saw this and I'm saving it for Sandra to look at properly 🤍",
    confidence: 0.3,
    intent: "generation_failed",
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
    return generationFailedDraft(params.latestMessage)
  }
}
