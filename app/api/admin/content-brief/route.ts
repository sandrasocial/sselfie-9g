import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getLatestAnalyticsReports } from "@/lib/analytics/reports"
import { getLatestContentBriefJob, queueContentBriefJob } from "@/lib/content-engine/brief-jobs"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL ? user.email : null
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 8), 30)

  const [reports, latestJob] = await Promise.all([
    getLatestAnalyticsReports({
      reportType: "content_brief_weekly",
      limit,
    }),
    getLatestContentBriefJob(),
  ])

  return NextResponse.json({ reports, latestJob })
}

export async function POST() {
  const adminEmail = await requireAdmin()
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { job, created } = await queueContentBriefJob({ requestedBy: adminEmail })
    return NextResponse.json({
      success: true,
      queued: true,
      created,
      job,
      message: created
        ? "Weekly brief queued. The background worker will build it without holding the browser open."
        : "A weekly brief job is already queued or running.",
    })
  } catch (error: unknown) {
    console.error("[content-brief] queue failed:", error)
    const message = error instanceof Error ? error.message : "Generation failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
