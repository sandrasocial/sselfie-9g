import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { checkAdminRateLimit } from "@/lib/security/admin-rate-limit"
import { getPipelineRunById } from "@/lib/data/pipeline-runs"

/**
 * GET /api/admin/pipelines/history/[id]
 * Get a single pipeline run by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    // Get ID from params
    const { id } = await params

    // Validate ID
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid pipeline run ID",
        },
        { status: 400 },
      )
    }

    // Get pipeline run
    const run = await getPipelineRunById(id)

    if (!run) {
      return NextResponse.json(
        {
          ok: false,
          error: "Pipeline run not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      run,
    })
  } catch (error) {
    console.error("[AdminPipelineRun] Error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}

