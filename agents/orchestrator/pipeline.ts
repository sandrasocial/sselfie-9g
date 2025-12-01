import type { PipelineStep, PipelineResult } from "./types"
import type { AgentResult } from "../core/agent-result"
import { isSuccess } from "../core/agent-result"
import { getRecentTraces } from "../monitoring/tracer"
import { getAllMetrics } from "../monitoring/metrics"

/**
 * PipelineOrchestrator
 * Orchestrates multi-step agent workflows
 * Executes steps sequentially, passing context between them
 * Returns AgentResult for each step with automatic success/failure handling
 */
export class PipelineOrchestrator {
  constructor(private steps: PipelineStep[]) {}

  /**
   * Run the pipeline with the given input
   * Executes steps sequentially, passing context between steps
   * Stops immediately on failure
   */
  async run(input: unknown): Promise<PipelineResult> {
    let context = input
    const stepResults: AgentResult[] = []

    for (const step of this.steps) {
      // Execute step via agent.process() which returns AgentResult
      const result = await step.agent.process(context)

      stepResults.push(result)

      // Check if step failed
      if (!isSuccess(result)) {
        // Get traces and metrics before returning
        const trace = getRecentTraces(50)
        const metrics = getAllMetrics()

        return {
          ok: false,
          steps: stepResults,
          failedAt: step.name,
          context,
          trace,
          metrics,
        }
      }

      // Step succeeded - extract data for next step
      context = result.data
    }

    // All steps succeeded
    const trace = getRecentTraces(50)
    const metrics = getAllMetrics()

    return {
      ok: true,
      steps: stepResults,
      context,
      trace,
      metrics,
    }
  }

  /**
   * Get pipeline metadata
   */
  getMetadata() {
    return {
      name: "PipelineOrchestrator",
      version: "1.0.0",
      description: "Orchestrates multi-step agent workflows",
      stepCount: this.steps.length,
      steps: this.steps.map((step) => step.name),
    }
  }
}

