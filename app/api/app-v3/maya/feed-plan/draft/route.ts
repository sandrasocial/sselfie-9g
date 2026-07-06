// SSELFIE Studio 3.0 - Feed Planner Phase 2b: Maya auto-drafts the month.
// POST-only (has side effects: writes feed_layouts/feed_posts rows). Fired once per user per
// calendar month by the Calendar tab / standalone /feed-planner route on open, when no plan
// exists yet for the current month - see app/feed-planner/feed-planner-client.tsx.
//
// Grounded exactly like /api/app-v3/maya/recommendations: getUserContextForMaya() + memory,
// one generateText call, defensively parsed JSON. No wizard, no blocking question for cadence
// or feed style - both resolve to sensible defaults (lib/feed-planner/cadence.ts,
// lib/feed-planner/resolve-feed-style.ts) that the member can change afterward in one turn.

import { NextResponse } from "next/server"
import { generateText } from "ai"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
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
  hasPlanForMonth,
  currentPeriodMonth,
} from "@/lib/feed-planner/write-auto-draft"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function extractJson(s: string): string {
  const t = s.replace(/```(?:json)?/gi, "").trim()
  const start = t.indexOf("{")
  const end = t.lastIndexOf("}")
  return start >= 0 && end > start ? t.slice(start, end + 1) : t
}

export async function POST() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const periodMonth = currentPeriodMonth()
  const advisoryLockKey = `feed-draft:${neonUser.id}:${periodMonth}`
  let lockAcquired = false

  try {
    const [lockResult] = await sql`SELECT pg_try_advisory_lock(hashtext(${advisoryLockKey})) AS locked`
    lockAcquired = Boolean(lockResult?.locked)
    if (!lockAcquired) {
      return NextResponse.json({ created: false, reason: "draft_in_progress" }, { status: 409 })
    }

    // Hard guard, re-checked under the lock: never draft twice, never touch a month that
    // already has a plan (even a manually-created one with real generated images).
    if (await hasPlanForMonth(neonUser.id, periodMonth)) {
      return NextResponse.json({ created: false, reason: "plan_exists" })
    }

    const [brandContext, personalBrand, memory] = await Promise.all([
      getUserContextForMaya(user.id),
      getUserPersonalBrand(neonUser.id).catch(() => null),
      getMemory(String(neonUser.id)).catch(() => null),
    ])

    const cadence = await resolvePostingCadence(neonUser.id)
    const postCount = postsPerMonthForCadence(cadence)
    const resolvedStyle = await resolveFeedStyleForUser(personalBrand)

    let agentName = "Maya"
    if (memory?.agentName?.trim()) agentName = memory.agentName.trim()

    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

    const system = [
      `You are ${agentName}, her personal content strategist at SSELFIE. Plan her Instagram feed for ${periodMonth} the way a stylist would: specific to her, never generic.`,
      `Plan exactly ${postCount} posts, spread naturally across the month (about ${cadence} per week) rather than clustered at the start.`,
      "Rules:",
      "- Each post's contentPillar is a short creator-specific category grounded in HER brand (e.g. 'Behind the offer', 'Client win', 'Personal story'), never generic ('Motivation', 'Lifestyle').",
      "- Each post's title is a short editorial label for that day's post (a few words), specific to what it's about.",
      "- Each post's caption is a real, postable Instagram caption in HER voice - warm, direct, human, a few sentences, no hashtag spam, no hype words, never a long dash.",
      "- plannedDate is an ISO date (YYYY-MM-DD) within the target month, one distinct date per post, in ascending order.",
      "- position is 1-indexed and sequential (1, 2, 3, ...).",
      "Return ONLY raw JSON, no prose, no code fences, in exactly this shape:",
      `{"themeSummary": string, "schedulingRationale": string, "posts": [{"position": number, "plannedDate": "YYYY-MM-DD", "contentPillar": string, "title": string, "caption": string}]}`,
    ].join("\n")

    const userMsg = [
      `Target month: ${periodMonth} (${daysInMonth} days).`,
      brandContext ? `What you know about her:\n${brandContext}` : "You don't have much on her yet; keep the plan about her business and audience, never generic.",
    ].join("\n\n")

    const { text } = await generateText({
      model: createMayaOpenRouterModel("chat_pro"),
      system,
      messages: [{ role: "user", content: userMsg }],
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
    if (!plan) {
      return NextResponse.json({ created: false, reason: "generation_failed" }, { status: 502 })
    }

    const grid = CURATED_FEED_STYLE_MAP[resolvedStyle.feedStyle].grid
    const { feedLayoutId, postIds } = await writeAutoDraft({
      userId: neonUser.id,
      periodMonth,
      plan,
      feedStyle: resolvedStyle.feedStyle,
      styleId: resolvedStyle.styleId,
      variationId: resolvedStyle.variationId,
      grid,
    })

    return NextResponse.json({ created: true, feedLayoutId, postCount: postIds.length })
  } catch (error) {
    console.error("[feed-plan draft] failed:", error)
    return NextResponse.json({ created: false, error: "draft_failed" }, { status: 500 })
  } finally {
    if (lockAcquired) {
      await sql`SELECT pg_advisory_unlock(hashtext(${advisoryLockKey}))`.catch(() => {})
    }
  }
}
