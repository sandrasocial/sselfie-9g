import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { reconcileAiImages } from "@/lib/generation/reconcile-ai-images"

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "ssa@ssasocial.com").trim().toLowerCase()
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || String(neonUser.email || "").trim().toLowerCase() !== getAdminEmail()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const limit = Math.max(1, Math.min(100, Number.parseInt(String(body?.limit || "25"), 10) || 25))
    const minAgeMinutes = Math.max(1, Math.min(120, Number.parseInt(String(body?.minAgeMinutes || "2"), 10) || 2))

    const summary = await reconcileAiImages({ limit, minAgeMinutes })

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    console.error("[v0] admin reconcile ai_images failed:", error)
    return NextResponse.json(
      { error: "Failed to reconcile ai_images", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

