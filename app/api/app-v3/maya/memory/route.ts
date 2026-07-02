// SSELFIE Studio 3.0 - /app memory read + write (MAYA-REBUILD-05 Phase E).
// GET -> what Maya remembers (agent name, brand notes, preferences).
// PUT -> patch any of those fields (empty string clears; absent leaves unchanged).
// Admin reaches it through the admin-gated /app shell; schema is member-ready.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { getMemory, removeLikenessNote, saveMemory } from "@/lib/app-v3/maya/memory-store"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"

export const dynamic = "force-dynamic"

const EMPTY = {
  agentName: null,
  brandNotes: null,
  preferences: null,
  userAvatarUrl: null,
  likenessNotes: [] as string[],
  hasBrandProfile: true,
}

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) return NextResponse.json(EMPTY)

  try {
    const mem = await getMemory(String(neonUserId))
    // Does she already have a real brand profile in the existing SSELFIE system? If so, we never
    // run progressive onboarding (Maya already knows her). Default to true on any doubt = don't nag.
    let hasBrandProfile = true
    try {
      const ctx = await getUserContextForMaya(user.id)
      hasBrandProfile = typeof ctx === "string" && ctx.trim().length > 200
    } catch {
      /* leave true */
    }
    return NextResponse.json({ ...mem, hasBrandProfile })
  } catch (e) {
    console.error("[app-v3 memory] read failed:", e)
    return NextResponse.json(EMPTY)
  }
}

export async function PUT(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as
    | {
        agentName?: string | null
        brandNotes?: string | null
        preferences?: string | null
        userAvatarUrl?: string | null
        /** LIKENESS-MEMORY-01: delete one stored likeness note (a wrong note must be removable). */
        removeLikenessNote?: string
      }
    | null
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) return NextResponse.json({ error: "User not found" }, { status: 404 })

  try {
    if (typeof body.removeLikenessNote === "string" && body.removeLikenessNote.trim()) {
      await removeLikenessNote(String(neonUserId), body.removeLikenessNote)
    }
    if (
      body.agentName !== undefined ||
      body.brandNotes !== undefined ||
      body.preferences !== undefined ||
      body.userAvatarUrl !== undefined
    ) {
      await saveMemory(String(neonUserId), {
        agentName: body.agentName,
        brandNotes: body.brandNotes,
        preferences: body.preferences,
        userAvatarUrl: body.userAvatarUrl,
      })
    }
    return NextResponse.json(await getMemory(String(neonUserId)))
  } catch (e) {
    console.error("[app-v3 memory] save failed:", e)
    return NextResponse.json({ error: "Could not save" }, { status: 500 })
  }
}
