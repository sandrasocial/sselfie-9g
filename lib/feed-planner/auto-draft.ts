// Feed Planner Phase 2b/2c - the auto-draft core, shared by the member-facing route
// (app/api/app-v3/maya/feed-plan/draft) and the monthly rollover cron
// (app/api/cron/feed-plan-monthly-draft). One place owns the lock, the guard, the LLM call,
// and the write - the two callers only differ in how they authenticate and pick the user.

import { generateText } from "ai"
import { createMayaOpenRouterModel, getMayaMaxTokensForTask } from "@/lib/maya/openrouter"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getUserPersonalBrand } from "@/lib/data/maya"
import { getMemory } from "@/lib/app-v3/maya/memory-store"
import { resolvePostingCadence, postsPerMonthForCadence } from "@/lib/feed-planner/cadence"
import { resolveFeedStyleForUser } from "@/lib/feed-planner/resolve-feed-style"
import { CURATED_FEED_STYLE_MAP } from "@/lib/style-presets"
import {
  validateFeedMonthPlan,
  writeAutoDraft,
  getMonthPlanState,
  currentPeriodMonth,
} from "@/lib/feed-planner/write-auto-draft"
import { sql } from "@/lib/db/client"
import { extractJson } from "@/lib/ai/extract-json"

export type AutoDraftOutcome =
  | { created: true; feedLayoutId: number; postCount: number }
  | { created: false; reason: "draft_in_progress" | "plan_exists" | "generation_failed" }

type AutoDraftPromptInput = {
  agentName: string
  periodMonth: string
  postCount: number
  cadence: number
  daysInMonth: number
  brandContext: string | null
}

export function buildAutoDraftPrompt(input: AutoDraftPromptInput): {
  system: string
  userMessage: string
} {
  const { agentName, periodMonth, postCount, cadence, daysInMonth, brandContext } = input
  const system = [
    `You are ${agentName}, her personal content strategist at SSELFIE. Plan her Instagram feed for ${periodMonth} the way a stylist would: specific to her, never generic.`,
    `Plan exactly ${postCount} posts, spread naturally across the month (about ${cadence} per week) rather than clustered at the start.`,
    "Factual safety:",
    "- Never invent facts, numbers, customer results, personal history, testimonials, pricing, timelines, or proof.",
    "- Use only facts explicitly present in the context. Treat missing information as unknown, not as permission to create a plausible detail.",
    "- Do not write first-person autobiography, quantified proof, or a client story unless the supplied context supports it.",
    "- When context is limited, write useful caption structures the member can personalize without pretending an unverified experience happened.",
    "Rules:",
    "- Each post's contentPillar is a short creator-specific category grounded in HER brand (e.g. 'Behind the offer', 'Useful lesson', 'Personal perspective'), never generic ('Motivation', 'Lifestyle').",
    "- Only use categories such as 'Client win' or 'Personal story' when the supplied context contains the real source material for them.",
    "- Each post's title is a short editorial label for that day's post (a few words), specific to what it's about.",
    "- Each post's caption is a real, postable Instagram caption in HER voice - warm, direct, human, a few sentences, no hashtag spam, no hype words, never a long dash.",
    "- plannedDate is an ISO date (YYYY-MM-DD) within the target month, one distinct date per post, in ascending order.",
    "- position is 1-indexed and sequential (1, 2, 3, ...).",
    "Return ONLY raw JSON, no prose, no code fences, in exactly this shape:",
    `{"themeSummary": string, "schedulingRationale": string, "posts": [{"position": number, "plannedDate": "YYYY-MM-DD", "contentPillar": string, "title": string, "caption": string}]}`,
  ].join("\n")

  const userMessage = [
    `Target month: ${periodMonth} (${daysInMonth} days).`,
    brandContext
      ? `What you know about her:\n${brandContext}`
      : "You don't have much on her yet. Keep the plan relevant to her business and audience. Use observations, useful how-to guidance, thoughtful questions, and editable caption structures. Do not fill missing context with plausible details.",
  ].join("\n\n")

  return { system, userMessage }
}

export async function draftMonthPlanForUser(
  authUserId: string,
  neonUserId: string | number,
): Promise<AutoDraftOutcome> {
  const periodMonth = currentPeriodMonth()
  const advisoryLockKey = `feed-draft:${neonUserId}:${periodMonth}`
  let lockAcquired = false

  try {
    const [lockResult] = await sql`SELECT pg_try_advisory_lock(hashtext(${advisoryLockKey})) AS locked`
    lockAcquired = Boolean(lockResult?.locked)
    if (!lockAcquired) return { created: false, reason: "draft_in_progress" }

    // Hard guard, re-checked under the lock: never draft twice, never touch a month that
    // already has a real plan (even a manually-created one with real generated images). A
    // place-photo STUB (she saved a chat photo before any plan existed) is the one exception:
    // the draft fills that layout in around her photo instead of creating a competing one.
    const monthState = await getMonthPlanState(neonUserId, periodMonth)
    if (monthState.state === "planned") return { created: false, reason: "plan_exists" }
    const stubLayoutId = monthState.state === "stub" ? (monthState.layoutId ?? undefined) : undefined

    const [brandContext, personalBrand, memory] = await Promise.all([
      getUserContextForMaya(authUserId),
      getUserPersonalBrand(String(neonUserId)).catch(() => null),
      getMemory(String(neonUserId)).catch(() => null),
    ])

    const cadence = await resolvePostingCadence(neonUserId)
    const postCount = postsPerMonthForCadence(cadence)
    const resolvedStyle = await resolveFeedStyleForUser(personalBrand, neonUserId)

    let agentName = "Maya"
    if (memory?.agentName?.trim()) agentName = memory.agentName.trim()

    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

    const { system, userMessage } = buildAutoDraftPrompt({
      agentName,
      periodMonth,
      postCount,
      cadence,
      daysInMonth,
      brandContext,
    })

    const { text } = await generateText({
      model: createMayaOpenRouterModel("chat_pro"),
      system,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.8,
      maxOutputTokens: getMayaMaxTokensForTask("chat_pro"),
    })

    let parsed: unknown = null
    try {
      parsed = JSON.parse(extractJson(text))
    } catch {
      console.error("[feed-plan draft] JSON parse failed. Raw model output:", text.slice(0, 400))
    }

    const plan = validateFeedMonthPlan(parsed, periodMonth)
    if (!plan) return { created: false, reason: "generation_failed" }

    const grid = CURATED_FEED_STYLE_MAP[resolvedStyle.feedStyle].grid
    const { feedLayoutId, postIds } = await writeAutoDraft({
      userId: neonUserId,
      periodMonth,
      plan,
      feedStyle: resolvedStyle.feedStyle,
      styleId: resolvedStyle.styleId,
      variationId: resolvedStyle.variationId,
      grid,
      existingLayoutId: stubLayoutId,
    })

    return { created: true, feedLayoutId, postCount: postIds.length }
  } finally {
    if (lockAcquired) {
      await sql`SELECT pg_advisory_unlock(hashtext(${advisoryLockKey}))`.catch(() => {})
    }
  }
}
