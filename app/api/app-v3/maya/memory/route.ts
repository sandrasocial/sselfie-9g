// SSELFIE Studio 3.0 — /app memory read + write (MAYA-REBUILD-05 Phase E).
// GET -> what Maya remembers (agent name, brand notes, preferences).
// PUT -> patch any of those fields (empty string clears; absent leaves unchanged).
// Admin reaches it through the admin-gated /app shell; schema is member-ready.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { getMemory, saveMemory } from "@/lib/app-v3/maya/memory-store"

export const dynamic = "force-dynamic"

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) return NextResponse.json({ agentName: null, brandNotes: null, preferences: null })

  try {
    return NextResponse.json(await getMemory(String(neonUserId)))
  } catch (e) {
    console.error("[app-v3 memory] read failed:", e)
    return NextResponse.json({ agentName: null, brandNotes: null, preferences: null })
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
      }
    | null
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) return NextResponse.json({ error: "User not found" }, { status: 404 })

  try {
    await saveMemory(String(neonUserId), {
      agentName: body.agentName,
      brandNotes: body.brandNotes,
      preferences: body.preferences,
      userAvatarUrl: body.userAvatarUrl,
    })
    return NextResponse.json(await getMemory(String(neonUserId)))
  } catch (e) {
    console.error("[app-v3 memory] save failed:", e)
    return NextResponse.json({ error: "Could not save" }, { status: 500 })
  }
}
