// SSELFIE Studio 3.0 - /app memory read + write (MAYA-REBUILD-05 Phase E).
// GET -> what Maya remembers (agent name, brand notes, preferences).
// PUT -> patch any of those fields (empty string clears; absent leaves unchanged).
// Admin reaches it through the admin-gated /app shell; schema is member-ready.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import {
  addLikenessNote,
  getMemory,
  removeLikenessNote,
  saveMemory,
} from "@/lib/app-v3/maya/memory-store"
import {
  getBrandProfileSummary,
  hasUsableBrandProfile,
} from "@/lib/app-v3/maya/brand-profile-store"
import {
  clearPreferredFeedStyle,
  getPreferredFeedStyle,
} from "@/lib/feed-planner/resolve-feed-style"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export const dynamic = "force-dynamic"

const EMPTY = {
  agentName: null,
  brandNotes: null,
  preferences: null,
  userAvatarUrl: null,
  preferredOverlayStyle: null,
  preferredFeedStyle: null,
  likenessNotes: [] as string[],
  hasBrandProfile: true,
}

async function readVisibleMemory(userId: string) {
  const [memory, preferredFeedStyle] = await Promise.all([
    getMemory(userId),
    getPreferredFeedStyle(userId),
  ])
  return { ...memory, preferredFeedStyle }
}

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) return NextResponse.json(EMPTY)

  try {
    const mem = await readVisibleMemory(String(neonUserId))
    // Progressive onboarding is based on real profile fields, not the length of Maya's assembled
    // context (purchases and account notes can make that string long even when her brand is empty).
    let hasBrandProfile = true
    try {
      hasBrandProfile =
        Boolean(mem.brandNotes?.trim()) || (await hasUsableBrandProfile(String(neonUserId)))
    } catch {
      /* leave true */
    }
    // When the manual notes are empty but Maya's real brand context exists, surface it —
    // the page must never claim Maya knows nothing while her chat plainly does (UX audit).
    let brandProfileSummary: string | null = null
    if (!mem.brandNotes?.trim()) {
      try {
        brandProfileSummary = await getBrandProfileSummary(String(neonUserId))
      } catch {
        /* summary is best-effort */
      }
    }
    return NextResponse.json({ ...mem, hasBrandProfile, brandProfileSummary })
  } catch (e) {
    console.error("[app-v3 memory] read failed:", e)
    return NextResponse.json({ error: "Could not load memory" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as {
    agentName?: string | null
    brandNotes?: string | null
    preferences?: string | null
    userAvatarUrl?: string | null
    preferredOverlayStyle?: string | null
    /** LIKENESS-MEMORY-01: delete one stored likeness note (a wrong note must be removable). */
    removeLikenessNote?: string
    /** MAYA-LEARNING-01: one-tap acceptance of a low-confidence capture offer. */
    addLikenessNote?: string
    /** Remove only Maya's learned feed world. */
    clearPreferredFeedStyle?: boolean
  } | null
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) return NextResponse.json({ error: "User not found" }, { status: 404 })

  try {
    if (typeof body.addLikenessNote === "string" && body.addLikenessNote.trim()) {
      const saved = await addLikenessNote(String(neonUserId), body.addLikenessNote)
      await Promise.all([
        logAnalyticsEvent({
          eventName: "suite_likeness_offer_accepted",
          userId: String(neonUserId),
          properties: { source: "app-v3-memory", total_notes: saved.total },
        }).catch(() => {}),
        logAnalyticsEvent({
          eventName: "suite_likeness_note_captured",
          userId: String(neonUserId),
          properties: { source: "app-v3-memory-offer", total_notes: saved.total },
        }).catch(() => {}),
      ])
    }
    if (typeof body.removeLikenessNote === "string" && body.removeLikenessNote.trim()) {
      await removeLikenessNote(String(neonUserId), body.removeLikenessNote)
      await logAnalyticsEvent({
        eventName: "suite_likeness_note_deleted",
        userId: String(neonUserId),
        properties: { source: "app-v3-memory" },
      }).catch(() => {})
    }
    if (body.clearPreferredFeedStyle === true) {
      await clearPreferredFeedStyle(String(neonUserId))
    }
    if (
      body.agentName !== undefined ||
      body.brandNotes !== undefined ||
      body.preferences !== undefined ||
      body.userAvatarUrl !== undefined ||
      body.preferredOverlayStyle !== undefined
    ) {
      await saveMemory(String(neonUserId), {
        agentName: body.agentName,
        brandNotes: body.brandNotes,
        preferences: body.preferences,
        userAvatarUrl: body.userAvatarUrl,
        preferredOverlayStyle: body.preferredOverlayStyle,
      })
    }
    return NextResponse.json(await readVisibleMemory(String(neonUserId)))
  } catch (e) {
    console.error("[app-v3 memory] save failed:", e)
    return NextResponse.json({ error: "Could not save" }, { status: 500 })
  }
}
