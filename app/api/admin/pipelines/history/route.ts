import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { checkAdminRateLimit } from "@/lib/security/admin-rate-limit"
import { getRecentPipelineRuns } from "@/lib/data/pipeline-runs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/pipelines/history
 * Get recent pipeline runs
 * Query params: ?limit=20 (optional)
 */
export async function GET(req: NextRequest) {
  try {
    // Admin authentication
    const admin = await requireAdmin()
    if (admin instanceof NextResponse) {
      return admin
    }

    // Rate limiting
    const rateLimitResult = await checkAdminRateLimit(req, admin.email)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Get query params
    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : 20

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid limit: must be between 1 and 100",
        },
        { status: 400 },
      )
    }

    // Get recent runs
    const runs = await getRecentPipelineRuns(limit)

    return NextResponse.json({
      ok: true,
      runs,
      count: runs.length,
    })
  } catch (error) {
    console.error("[AdminPipelineHistory] Error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}

