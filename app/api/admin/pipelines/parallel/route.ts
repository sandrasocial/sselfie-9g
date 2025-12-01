import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { checkAdminRateLimit } from "@/lib/security/admin-rate-limit"
import { ParallelPipeline } from "@/agents/orchestrator/parallel-pipeline"
import type { PipelineStep } from "@/agents/orchestrator/types"
import { AgentRegistry } from "@/agents/core/agent-registry"
import { getRecentTraces } from "@/agents/monitoring/tracer"
import { getAllMetrics } from "@/agents/monitoring/metrics"

/**
 * POST /api/admin/pipelines/parallel
 * Execute a parallel pipeline (mixed parallel and sequential steps)
 * 
 * Request body:
 * {
 *   steps: [
 *     [ { agent: "DailyContentAgent", input: {...} },
 *       { agent: "FeedDesignerAgent", input: {...} } ], // parallel block
 *     { agent: "AutoPostingAgent", input: {...} }        // sequential step
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Admin authentication
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await checkAdminRateLimit(admin.email)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: rateLimitResult.retryAfter },
        { status: 429 },
      )
    }

    // Parse request body
    const body = await req.json()

    if (!body.steps || !Array.isArray(body.steps)) {
      return NextResponse.json({ error: "Invalid request: 'steps' must be an array" }, { status: 400 })
    }

    // Build pipeline steps
    const pipelineSteps: (PipelineStep | PipelineStep[])[] = []

    for (let i = 0; i < body.steps.length; i++) {
      const step = body.steps[i]

      if (Array.isArray(step)) {
        // Parallel block: array of steps
        const parallelSteps: PipelineStep[] = []

        for (const parallelStep of step) {
          if (!parallelStep.agent || typeof parallelStep.agent !== "string") {
            return NextResponse.json(
              { error: `Invalid parallel step at index ${i}: missing 'agent'` },
              { status: 400 },
            )
          }

          // Block Maya from admin API
          if (parallelStep.agent.toLowerCase().includes("maya")) {
            return NextResponse.json(
              { error: "Maya cannot be run via admin pipeline API" },
              { status: 403 },
            )
          }

          const agent = AgentRegistry.get(parallelStep.agent)
          if (!agent) {
            return NextResponse.json(
              { error: `Agent not found: ${parallelStep.agent}` },
              { status: 404 },
            )
          }

          parallelSteps.push({
            name: `parallel-${i}-${parallelStep.agent}`,
            agent,
            run: async (context: unknown) => {
              const result = await agent.process(parallelStep.input ?? context)
              return result.ok ? result.data : context
            },
          })
        }

        pipelineSteps.push(parallelSteps)
      } else {
        // Sequential step: single step
        if (!step.agent || typeof step.agent !== "string") {
          return NextResponse.json(
            { error: `Invalid step at index ${i}: missing 'agent'` },
            { status: 400 },
          )
        }

        // Block Maya from admin API
        if (step.agent.toLowerCase().includes("maya")) {
          return NextResponse.json(
            { error: "Maya cannot be run via admin pipeline API" },
            { status: 403 },
          )
        }

        const agent = AgentRegistry.get(step.agent)
        if (!agent) {
          return NextResponse.json(
            { error: `Agent not found: ${step.agent}` },
            { status: 404 },
          )
        }

        pipelineSteps.push({
          name: `step-${i}-${step.agent}`,
          agent,
          run: async (context: unknown) => {
            const result = await agent.process(step.input ?? context)
            return result.ok ? result.data : context
          },
        })
      }
    }

    // Run parallel pipeline
    const pipeline = new ParallelPipeline(pipelineSteps)
    const result = await pipeline.run(body.steps[0]?.input || {})

    // Always return HTTP 200 with PipelineResult (success/failure is in result.ok)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[AdminParallelPipeline] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

