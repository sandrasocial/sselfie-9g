import { ownedGalleryPhotos } from "@/lib/app-v3/gallery-details"
import { searchGalleryPhotos } from "@/lib/app-v3/gallery-search"
// SSELFIE Studio 3.0 - Daily Relevance Engine (MAYA-REBUILD-05 Phase 5).
// Maya recommends what the creator should post today, grounded in her brand profile, memory,
// and recent activity. Powers the Content surface ("Good morning Sandra, here's what I'd
// create today"). Returns a warm greeting + 3 to 5 creator-specific ideas, each with a format.

import { NextResponse } from "next/server"
import { generateText } from "ai"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { requireMayaInferenceAccess } from "@/lib/maya/require-inference-access"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getMemory } from "@/lib/app-v3/maya/memory-store"
import { listChats } from "@/lib/app-v3/maya/chat-store"
import { hasUsableBrandProfile } from "@/lib/app-v3/maya/brand-profile-store"
import { sql } from "@/lib/db/client"
import { extractJson } from "@/lib/ai/extract-json"
import type { OutputFormat } from "@/components/app-v3/types"
import {
  getCachedRecommendations,
  getRecommendationContextFingerprint,
  saveCachedRecommendations,
} from "@/lib/app-v3/maya/recommendation-cache"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const VALID_FORMATS: OutputFormat[] = ["photo", "reel-cover", "carousel", "story-slide"]

interface Recommendation {
  title: string
  rationale: string
  format: OutputFormat
  /** The best-matching Library image for this idea (null = frontend uses the Vault fallback). */
  imageUrl?: string | null
  /** A short "why this image" so Maya can explain her choice. */
  imageReason?: string | null
}

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Recommendations run a language model. Same paid surface, same gate.
  const gateUserId = await getUserIdFromSupabase(user.id)
  const inferenceAccess = await requireMayaInferenceAccess({
    neonUserId: gateUserId,
    email: user.email,
  })
  if (!inferenceAccess.allowed) {
    return NextResponse.json(inferenceAccess.body, { status: inferenceAccess.status })
  }

  // Everything Maya knows: brand profile + memory + what she's recently made.
  let brandContext = ""
  let agentName = "Maya"
  let recentActivity: string[] = []
  let hasMeaningfulContext = false
  let neonUserId: string | null = null
  try {
    const mappedUserId = await getUserIdFromSupabase(user.id)
    if (mappedUserId) {
      neonUserId = String(mappedUserId)
      const [mem, chats, hasBrandProfile] = await Promise.all([
        getMemory(neonUserId),
        listChats(neonUserId),
        hasUsableBrandProfile(mappedUserId).catch(() => false),
      ])
      if (mem.agentName?.trim()) agentName = mem.agentName.trim()
      if (mem.brandNotes?.trim()) brandContext += `\nNotes she gave: ${mem.brandNotes.trim()}`
      hasMeaningfulContext =
        Boolean(mem.brandNotes?.trim()) ||
        Object.values(mem.facts ?? {}).some(f => f.value && !f.key.startsWith("example-")) ||
        hasBrandProfile
      recentActivity = chats
        .map(c => c.title)
        .filter((t): t is string => !!t && t.trim().length > 0)
        .filter(t => !/^(let's|actually,\s*let's)\b/i.test(t.trim()))
        .slice(0, 8)
      if (hasMeaningfulContext)
        brandContext = [await getUserContextForMaya(user.id), brandContext]
          .filter(Boolean)
          .join("\n")
    }
  } catch (e) {
    console.error("[app-v3 recommendations] context load skipped:", e)
  }

  // A name and selfie do not prove a business, audience, or personal story. Let the
  // deterministic frontend starter lead until the member has taught Maya enough to be specific.
  if (!hasMeaningfulContext) {
    return NextResponse.json({ greeting: "", recommendations: [] })
  }

  const firstName =
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null

  const contextFingerprint = getRecommendationContextFingerprint({
    agentName,
    firstName,
    brandContext,
    recentActivity,
  })
  if (neonUserId) {
    const cached = await getCachedRecommendations(neonUserId, contextFingerprint)
    if (cached) return NextResponse.json(cached)
  }

  const system = [
    `You are ${agentName}, her personal creative director at SSELFIE. You decide what she should post next, like a stylist who knows her, not a generic AI.`,
    "Recommend 3 to 5 content ideas for today, grounded in HER brand, story, and recent activity.",
    "Rules:",
    "- Each idea TITLE is a creator-specific content angle tied to a real topic in HER supplied brand context, never a generic mood such as 'Authentic Moment' or 'Boss Energy'.",
    "- Never suggest a personal story, origin story, client result, or lived event unless that exact source appears in her context or recent activity. If it is missing, recommend a useful brand photo, teaching angle, or question instead.",
    "- Each idea has a one-line rationale: why this, now (what is missing from her feed, what her audience needs).",
    "- Each idea has a format: one of photo, reel-cover, carousel, story-slide. Pick the format that fits the idea.",
    "- greeting: short and sharp, not a paragraph. One warm opener plus at most one observation directly supported by the recent activity list. Keep it to one or two short sentences.",
    "- Never use the long dash (em dash). Short, warm, human. No hype words.",
    "Return ONLY raw JSON, no prose, no code fences, in exactly this shape:",
    `{"greeting": string, "recommendations": [{"title": string, "rationale": string, "format": "photo|reel-cover|carousel|story-slide"}]}`,
  ].join("\n")

  const userMsg = [
    firstName ? `Her name: ${firstName}.` : "",
    brandContext
      ? `What you know about her:\n${brandContext}`
      : "You don't have much on her yet; keep ideas about her business and audience, never generic.",
    recentActivity.length ? `Recently she created: ${recentActivity.join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    const { text } = await generateText({
      model: createMayaOpenRouterModel("chat_default", {
        userId: neonUserId,
        feature: "app_v3_recommendations",
      }),
      system,
      messages: [{ role: "user", content: userMsg }],
      temperature: 0.8,
      maxOutputTokens: 800,
    })

    let parsed: { greeting?: unknown; recommendations?: unknown } | null = null
    try {
      parsed = JSON.parse(extractJson(text))
    } catch {
      console.error(
        "[app-v3 recommendations] JSON parse failed. Raw model output:",
        text.slice(0, 400)
      )
      parsed = null
    }

    const greeting = typeof parsed?.greeting === "string" ? parsed.greeting : ""
    const recommendations: Recommendation[] = Array.isArray(parsed?.recommendations)
      ? (parsed.recommendations as unknown[])
          .map(r => r as Record<string, unknown>)
          .filter(
            r =>
              typeof r?.title === "string" &&
              typeof r?.rationale === "string" &&
              typeof r?.format === "string" &&
              VALID_FORMATS.includes(r.format as OutputFormat)
          )
          .slice(0, 5)
          .map(r => ({
            title: r.title as string,
            rationale: r.rationale as string,
            format: r.format as OutputFormat,
          }))
      : []

    // Match the most contextually relevant Library image to each recommendation (best-effort).
    try {
      const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
      const neonUser = await getEffectiveNeonUser(user.id)
      if (neonUser) {
        const photos = await ownedGalleryPhotos(String(neonUser.id))
        const used = new Set<string>()
        for (const rec of recommendations) {
          const matches = searchGalleryPhotos(
            photos.filter(a => !!a.description || !!a.labels),
            `${rec.title} ${rec.rationale}`,
            true
          )
          const best = matches.find(a => !used.has(a.id))
          if (best) {
            rec.imageUrl = best.url
            rec.imageReason =
              "Matched to its saved photo description or your labels; not marked posted."
            used.add(best.id)
          }
        }
      }
    } catch (e) {
      console.error("[app-v3 recommendations] image match skipped:", e)
    }

    const payload = { greeting, recommendations }
    if (neonUserId) {
      await saveCachedRecommendations(neonUserId, contextFingerprint, payload)
    }
    return NextResponse.json(payload)
  } catch (e) {
    console.error("[app-v3 recommendations] generation failed:", e)
    // Graceful: the Content surface falls back to the plain format starters.
    return NextResponse.json({ greeting: "", recommendations: [] })
  }
}
