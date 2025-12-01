import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { AgentRegistry } from "@/agents/core/agent-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Run Any Agent API
 * Admin-only endpoint to execute any agent by name
 */
export async function POST(req: NextRequest) {
  try {
    // Admin authentication
    const admin = await requireAdmin(req)
    if (admin instanceof NextResponse) {
      return admin
    }

    // Parse request body
    const body = await req.json()
    const { agent: agentName, input } = body

    // Validate input
    if (!agentName || typeof agentName !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'agent' field" }, { status: 400 })
    }

    if (input === undefined) {
      return NextResponse.json({ error: "Missing 'input' field" }, { status: 400 })
    }

    if (typeof input !== "object" || input === null) {
      return NextResponse.json({ error: "Input must be an object" }, { status: 400 })
    }

    // Safety: Block Maya from being run via admin API
    if (agentName.toLowerCase().includes("maya")) {
      return NextResponse.json(
        { error: "Maya cannot be run via admin agent API." },
        { status: 403 },
      )
    }

    // Lookup agent
    const agent = AgentRegistry.get(agentName)
    if (!agent) {
      return NextResponse.json(
        {
          error: `Agent not found: ${agentName}`,
          availableAgents: AgentRegistry.list(),
        },
        { status: 404 },
      )
    }

    // Execute agent (returns AgentResult)
    const result = await agent.process(input)

    // Get recent traces and metrics
    const { getRecentTraces } = await import("@/agents/monitoring/tracer")
    const { getAllMetrics } = await import("@/agents/monitoring/metrics")

    // Always return HTTP 200 with AgentResult (success/failure is in the result object)
    return NextResponse.json({
      ...result,
      metadata: agent.getMetadata(),
      trace: getRecentTraces(50),
      metrics: getAllMetrics(),
    })
  } catch (error) {
    console.error("[AdminAgentRun] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

/**
 * List all available agents
 */
export async function GET(req: NextRequest) {
  try {
    // Admin authentication
    const admin = await requireAdmin(req)
    if (admin instanceof NextResponse) {
      return admin
    }

    const agents = AgentRegistry.list()
    const metadata = AgentRegistry.getAllMetadata()
    
    return NextResponse.json({
      ok: true,
      agents,
      metadata,
      total: agents.length,
    })
  } catch (error) {
    console.error("[AdminAgentList] Error:", error)
    // Always return JSON, never HTML
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
        agents: [],
        metadata: [],
        total: 0,
      },
      { status: 500 },
    )
  }
}

