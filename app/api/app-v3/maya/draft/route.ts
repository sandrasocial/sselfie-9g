import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { clearActiveDraft, loadActiveDraft, saveActiveDraft } from "@/lib/app-v3/maya/draft-store"
import { sanitizeServerMayaDraftSnapshot } from "@/lib/app-v3/maya/draft-snapshot"

export const dynamic = "force-dynamic"

async function getNeonUserId() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return { error: "Unauthorized", status: 401 as const, userId: null }
  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) return { error: "User not found", status: 404 as const, userId: null }
  return { error: null, status: 200 as const, userId: String(neonUserId) }
}

export async function GET() {
  const auth = await getNeonUserId()
  if (!auth.userId) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const draft = await loadActiveDraft(auth.userId)
    return NextResponse.json({ draft })
  } catch (error) {
    console.error("[app-v3 maya draft] load failed:", error)
    return NextResponse.json({ error: "Could not load draft" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await getNeonUserId()
  if (!auth.userId) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const draft = sanitizeServerMayaDraftSnapshot(body?.draft ?? body)
  if (!draft) return NextResponse.json({ error: "Invalid draft" }, { status: 400 })

  try {
    await saveActiveDraft(auth.userId, draft)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[app-v3 maya draft] save failed:", error)
    return NextResponse.json({ error: "Could not save draft" }, { status: 500 })
  }
}

export async function DELETE() {
  const auth = await getNeonUserId()
  if (!auth.userId) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    await clearActiveDraft(auth.userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[app-v3 maya draft] clear failed:", error)
    return NextResponse.json({ error: "Could not clear draft" }, { status: 500 })
  }
}
