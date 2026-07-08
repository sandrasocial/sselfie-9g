import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { addAdminMemoryNote } from "@/lib/app-v3/maya/admin-memory-store"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL ? user.email : null
}

function compact(value: unknown, max = 280) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : ""
}

export async function POST(request: NextRequest) {
  const adminEmail = await requireAdmin()
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const decision = body.decision === "rejection" ? "rejection" : "approval"
  const title = compact(body.title, 120) || "Content brief piece"
  const hook = compact(body.hook)
  const storyAnchor = compact(body.sandraStoryAnchor)
  const reason = compact(body.reason, 220)

  const note = [
    decision === "approval"
      ? "Sandra approved this content direction."
      : "Sandra rejected this content direction as off-voice or not useful.",
    title ? `Title: "${title}".` : "",
    hook ? `Hook: "${hook}".` : "",
    storyAnchor ? `Sandra anchor: "${storyAnchor}".` : "",
    reason ? `Reason: "${reason}".` : "",
  ]
    .filter(Boolean)
    .join(" ")

  const result = await addAdminMemoryNote({
    adminUserId: adminEmail,
    kind: decision,
    sourceType: "content_brief",
    sourceId: compact(body.sourceId, 120) || null,
    sourceTitle: title,
    note,
    metadata: {
      format: compact(body.format, 40),
      funnelStage: compact(body.funnelStage, 40),
      ctaKeyword: compact(body.ctaKeyword, 40),
      decision,
    },
  })

  return NextResponse.json({ success: true, saved: result.saved })
}
