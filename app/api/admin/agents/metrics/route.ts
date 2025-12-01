import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { checkAdminRateLimit } from "@/lib/security/admin-rate-limit"
import { getAllMetrics, resetMetrics } from "@/agents/monitoring/metrics"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/agents/metrics
 * Get current agent metrics
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

    // Get metrics
    const metrics = getAllMetrics()

    return NextResponse.json({
      ok: true,
      metrics,
    })
  } catch (error) {
    console.error("[AdminMetrics] Error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/admin/agents/metrics
 * Reset all metrics
 */
export async function POST(req: NextRequest) {
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

    // Reset metrics
    resetMetrics()

    return NextResponse.json({
      ok: true,
      reset: true,
    })
  } catch (error) {
    console.error("[AdminMetrics] Error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}

