import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { AgentRegistry } from "@/agents/core/agent-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/agents/list
 * List all available agents
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (admin instanceof NextResponse) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized", agents: [], total: 0 },
        { status: 401 },
      )
    }

    const agents = AgentRegistry.list()
    const agentDetails = agents.map((name) => {
      try {
        const agent = AgentRegistry.get(name)
        if (!agent) {
          return null
        }
        const metadata = agent.getMetadata()
        return {
          name: metadata.name || name,
          description: metadata.description || "",
          version: metadata.version || "1.0.0",
          critical: metadata.critical || false,
        }
      } catch (err) {
        console.error(`[AgentList] Error getting metadata for ${name}:`, err)
        return null
      }
    }).filter(Boolean)

    return NextResponse.json({
      ok: true,
      agents: agentDetails,
      total: agentDetails.length,
    })
  } catch (error) {
    console.error("[AgentList] Error:", error)
    // Always return JSON, never HTML
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        agents: [],
        total: 0,
      },
      { status: 500 },
    )
  }
}

