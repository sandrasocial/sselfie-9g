// SSELFIE Studio 3.0 — Daily Relevance Engine (MAYA-REBUILD-05 Phase 5).
// Maya recommends what the creator should post today, grounded in her brand profile, memory,
// and recent activity. Powers the Content surface ("Good morning Sandra, here's what I'd
// create today"). Returns a warm greeting + 3 to 5 creator-specific ideas, each with a format.

import { NextResponse } from "next/server"
import { generateText } from "ai"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { createMayaOpenRouterModel, getMayaMaxTokensForTask } from "@/lib/maya/openrouter"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getMemory } from "@/lib/app-v3/maya/memory-store"
import { listChats } from "@/lib/app-v3/maya/chat-store"
import type { OutputFormat } from "@/components/app-v3/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const VALID_FORMATS: OutputFormat[] = ["photo", "reel-cover", "carousel", "story-slide"]

interface Recommendation {
  title: string
  rationale: string
  format: OutputFormat
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
}

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Everything Maya knows: brand profile + memory + what she's recently made.
  let brandContext = ""
  let agentName = "Maya"
  let recentActivity: string[] = []
  try {
    brandContext = await getUserContextForMaya(user.id)
    const neonUserId = await getUserIdFromSupabase(user.id)
    if (neonUserId) {
      const mem = await getMemory(String(neonUserId))
      if (mem.agentName?.trim()) agentName = mem.agentName.trim()
      if (mem.brandNotes?.trim()) brandContext += `\nNotes she gave: ${mem.brandNotes.trim()}`
      const chats = await listChats(String(neonUserId))
      recentActivity = chats
        .map((c) => c.title)
        .filter((t): t is string => !!t && t.trim().length > 0)
        .filter((t) => !/^(let's|actually,\s*let's)\b/i.test(t.trim()))
        .slice(0, 8)
    }
  } catch (e) {
    console.error("[app-v3 recommendations] context load skipped:", e)
  }

  const firstName =
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null

  const system = [
    `You are ${agentName}, her personal creative director at SSELFIE. You decide what she should post next, like a stylist who knows her, not a generic AI.`,
    "Recommend 3 to 5 content ideas for today, grounded in HER brand, story, and recent activity.",
    "Rules:",
    "- Each idea TITLE is a creator-specific content angle in HER voice, tied to her real story/brand (e.g. 'The Selfie I Almost Didn't Post'), NEVER a generic mood ('Authentic Moment', 'Boss Energy').",
    "- Each idea has a one-line rationale: why this, now (what is missing from her feed, what her audience needs).",
    "- Each idea has a format: one of photo, reel-cover, carousel, story-slide. Pick the format that fits the idea.",
    "- A warm one-line greeting that, when it makes sense, references her recent activity (e.g. she has mostly posted selfies lately, or her audience hasn't heard a personal story in a while).",
    "- Never use the long dash (em dash). Short, warm, human. No hype words.",
    "Return ONLY raw JSON, no prose, no code fences, in exactly this shape:",
    `{"greeting": string, "recommendations": [{"title": string, "rationale": string, "format": "photo|reel-cover|carousel|story-slide"}]}`,
  ].join("\n")

  const userMsg = [
    firstName ? `Her name: ${firstName}.` : "",
    brandContext ? `What you know about her:\n${brandContext}` : "You don't have much on her yet; keep ideas about her business and audience, never generic.",
    recentActivity.length ? `Recently she created: ${recentActivity.join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    const { text } = await generateText({
      model: createMayaOpenRouterModel("chat_pro"),
      system,
      messages: [{ role: "user", content: userMsg }],
      temperature: 0.8,
      maxOutputTokens: getMayaMaxTokensForTask("chat_pro"),
    })

    let parsed: { greeting?: unknown; recommendations?: unknown } | null = null
    try {
      parsed = JSON.parse(stripFences(text))
    } catch {
      parsed = null
    }

    const greeting = typeof parsed?.greeting === "string" ? parsed.greeting : ""
    const recommendations: Recommendation[] = Array.isArray(parsed?.recommendations)
      ? (parsed.recommendations as unknown[])
          .map((r) => r as Record<string, unknown>)
          .filter(
            (r) =>
              typeof r?.title === "string" &&
              typeof r?.rationale === "string" &&
              typeof r?.format === "string" &&
              VALID_FORMATS.includes(r.format as OutputFormat),
          )
          .slice(0, 5)
          .map((r) => ({
            title: r.title as string,
            rationale: r.rationale as string,
            format: r.format as OutputFormat,
          }))
      : []

    return NextResponse.json({ greeting, recommendations })
  } catch (e) {
    console.error("[app-v3 recommendations] generation failed:", e)
    // Graceful: the Content surface falls back to the plain format starters.
    return NextResponse.json({ greeting: "", recommendations: [] })
  }
}
