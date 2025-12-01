import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { checkAdminRateLimit } from "@/lib/security/admin-rate-limit"
import { PipelineOrchestrator } from "@/agents/orchestrator/pipeline"
import type { PipelineStep } from "@/agents/orchestrator/types"
import { AgentRegistry } from "@/agents/core/agent-registry"
import { AgentTrace, getRecentTraces } from "@/agents/monitoring/tracer"
import { getAllMetrics } from "@/agents/monitoring/metrics"
import { savePipelineRun } from "@/lib/data/pipeline-runs"

/**
 * Run Pipeline API
 * Admin-only endpoint to execute multi-step agent pipelines
 */
export async function POST(req: NextRequest) {
  try {
    // Admin authentication
    const admin = await requireAdmin(req)
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
    const { steps } = body

    // Validate input
    if (!steps || !Array.isArray(steps)) {
      return NextResponse.json({ error: "Missing or invalid 'steps' field (must be array)" }, { status: 400 })
    }

    if (steps.length === 0) {
      return NextResponse.json({ error: "Steps array cannot be empty" }, { status: 400 })
    }

    // Validate each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]

      if (!step.agent || typeof step.agent !== "string") {
        return NextResponse.json(
          { error: `Step ${i + 1}: Missing or invalid 'agent' field` },
          { status: 400 },
        )
      }

      // Safety: Block Maya from being run via admin API
      if (step.agent.toLowerCase().includes("maya")) {
        return NextResponse.json(
          { error: "Maya cannot be run via admin pipeline API." },
          { status: 403 },
        )
      }

      // Validate agent exists
      if (!AgentRegistry.has(step.agent)) {
        return NextResponse.json(
          {
            error: `Step ${i + 1}: Agent not found: ${step.agent}`,
            availableAgents: AgentRegistry.list(),
          },
          { status: 404 },
        )
      }

      // Validate step input
      if (step.input !== undefined && (typeof step.input !== "object" || step.input === null)) {
        return NextResponse.json(
          { error: `Step ${i + 1}: Input must be an object` },
          { status: 400 },
        )
      }
    }

    // Build pipeline steps
    const pipelineSteps: PipelineStep[] = steps.map((step: { agent: string; input?: any }, index: number) => {
      const agent = AgentRegistry.get(step.agent)
      if (!agent) {
        throw new Error(`Agent not found: ${step.agent}`)
      }

      return {
        name: `step-${index + 1}-${step.agent}`,
        agent,
        run: async (context: any) => {
          // Use step input if provided, otherwise use context from previous step
          const input = step.input !== undefined ? step.input : context
          return await agent.process(input)
        },
      }
    })

    // Run pipeline (returns PipelineResult with ok, steps, trace, metrics)
    const startTime = Date.now()
    const orchestrator = new PipelineOrchestrator(pipelineSteps)
    const result = await orchestrator.run(steps[0]?.input || {})
    const duration = Date.now() - startTime

    // Save pipeline run to history (non-blocking)
    const pipelineName = steps.map((s: any) => s.agent).join(" → ")
    savePipelineRun(pipelineName, result.steps, result, duration).catch((err) => {
      console.error("[AdminPipelineRun] Failed to save pipeline run:", err)
    })

    // Always return HTTP 200 with PipelineResult (success/failure is in result.ok)
    return NextResponse.json({
      ok: result.ok || false,
      steps: result.steps || [],
      failedAt: result.failedAt || null,
      trace: result.trace || [],
      metrics: result.metrics || {},
      error: result.error || null,
    })
  } catch (error) {
    console.error("[AdminPipelineRun] Error:", error)
    // Always return JSON, never HTML
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
        steps: [],
        failedAt: null,
        trace: [],
        metrics: {},
      },
      { status: 500 },
    )
  }
}

