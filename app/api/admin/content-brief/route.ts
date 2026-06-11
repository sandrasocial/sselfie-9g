import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { generateContentBrief } from "@/lib/content-engine/brief-generator"
import { getLatestAnalyticsReports, storeAnalyticsReport } from "@/lib/analytics/reports"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 8), 30)

  const reports = await getLatestAnalyticsReports({
    reportType: "content_brief_weekly",
    limit,
  })

  return NextResponse.json({ reports })
}

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const brief = await generateContentBrief()

    await storeAnalyticsReport({
      reportType: "content_brief_weekly",
      periodStart: new Date(brief.periodStart),
      periodEnd: new Date(brief.periodEnd),
      payload: brief,
    })

    return NextResponse.json({ success: true, brief })
  } catch (error: any) {
    console.error("[content-brief] manual generation failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Generation failed" },
      { status: 500 },
    )
  }
}
