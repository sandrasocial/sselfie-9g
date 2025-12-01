import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { checkAdminRateLimit } from "@/lib/security/admin-rate-limit"
import { BatchJobManager } from "@/agents/orchestrator/batch-manager"
import { AgentRegistry } from "@/agents/core/agent-registry"

/**
 * POST /api/admin/batch/run
 * Run a batch job using BatchJobManager
 * 
 * Request body:
 * {
 *   agent: "AgentName",
 *   inputs: [{...}, {...}, ...]
 * }
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

    // Parse request body
    const body = await req.json()

    // Validate input
    if (!body.agent || typeof body.agent !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request: 'agent' must be a string",
        },
        { status: 400 },
      )
    }

    if (!Array.isArray(body.inputs)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request: 'inputs' must be an array",
        },
        { status: 400 },
      )
    }

    // Block Maya from admin API
    if (body.agent.toLowerCase().includes("maya")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Maya cannot be run via admin batch API",
        },
        { status: 403 },
      )
    }

    // Validate agent exists
    const agent = AgentRegistry.get(body.agent)
    if (!agent) {
      return NextResponse.json(
        {
          ok: false,
          error: `Agent not found: ${body.agent}`,
        },
        { status: 404 },
      )
    }

    // Validate inputs array size
    if (body.inputs.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request: 'inputs' array cannot be empty",
        },
        { status: 400 },
      )
    }

    if (body.inputs.length > 1000) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request: 'inputs' array cannot exceed 1000 items",
        },
        { status: 400 },
      )
    }

    // Run batch job
    const manager = new BatchJobManager()
    const result = await manager.runBatch(body.agent, body.inputs)

    return NextResponse.json({
      ok: true,
      result,
    })
  } catch (error) {
    console.error("[AdminBatchRun] Error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}

