// POST-NOW-01: on-demand "I need something to post now" endpoint.
// POST  -> generate + store three ready-tonight options (repurpose, trend-test, story-sequence)
// PATCH -> mark one option used / dismissed so it never comes back
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { runPostNow, setSuggestionStatus } from "@/lib/admin/post-now"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin(request?: NextRequest) {
  // CRON_SECRET bearer lets server-side automation use this too (same
  // convention as the other admin content-kit routes).
  const bearer = request?.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && bearer === `Bearer ${cronSecret}`) return true
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await runPostNow()
    return NextResponse.json({
      success: true,
      options: result.options,
      missingInputs: result.missingInputs,
    })
  } catch (error: any) {
    console.error("[post-now] generation failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Generation failed" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const id = Number(body.id)
  const status = body.status
  if (!id || !["used", "dismissed"].includes(status)) {
    return NextResponse.json(
      { error: "id and status (used|dismissed) required" },
      { status: 400 },
    )
  }
  try {
    const updated = await setSuggestionStatus(id, status)
    if (!updated) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[post-now] status update failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Update failed" },
      { status: 500 },
    )
  }
}
