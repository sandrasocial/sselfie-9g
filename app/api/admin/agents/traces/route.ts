import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { checkAdminRateLimit } from "@/lib/security/admin-rate-limit"
import { getAgentTraces, getRecentTraces, clearTraces } from "@/agents/monitoring/tracer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/agents/traces
 * Get recent traces or traces for a specific agent
 * Query params: ?agent=AgentName (optional)
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
    const agent = searchParams.get("agent")

    // Block Maya traces from admin API
    if (agent && agent.toLowerCase().includes("maya")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Maya traces cannot be accessed via admin API",
        },
        { status: 403 },
      )
    }

    // Get traces
    const traces = agent ? getAgentTraces(agent) : getRecentTraces(200)

    return NextResponse.json({
      ok: true,
      traces,
      count: traces.length,
    })
  } catch (error) {
    console.error("[AdminTraces] Error:", error)
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
 * POST /api/admin/agents/traces
 * Clear all traces
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

    // Clear traces
    clearTraces()

    return NextResponse.json({
      ok: true,
      cleared: true,
    })
  } catch (error) {
    console.error("[AdminTraces] Error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}

