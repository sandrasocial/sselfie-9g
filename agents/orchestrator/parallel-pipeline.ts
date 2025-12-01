/**
 * Parallel Pipeline
 * Supports mixed parallel and sequential execution
 * Steps can be single (sequential) or arrays (parallel)
 */

import { ParallelExecutor, type ParallelTask } from "./parallel"
import type { PipelineStep } from "./types"
import type { PipelineResult } from "./types"
import { PipelineOrchestrator } from "./pipeline"
import { getRecentTraces } from "../monitoring/tracer"
import { getAllMetrics } from "../monitoring/metrics"

/**
 * ParallelPipeline
 * Executes steps that can be either sequential (single step) or parallel (array of steps)
 */
export class ParallelPipeline {
  constructor(private steps: (PipelineStep | PipelineStep[])[]) {}

  /**
   * Run the pipeline
   * Sequential steps run one after another
   * Parallel steps (arrays) run concurrently
   */
  async run(input: unknown): Promise<PipelineResult> {
    let context = input
    const stepResults: any[] = []

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i]

      if (Array.isArray(step)) {
        // Parallel block: run all steps concurrently
        const parallelTasks: ParallelTask[] = step.map((s) => ({
          agent: s.agent.getMetadata().name,
          input: context,
        }))

        const executor = new ParallelExecutor(parallelTasks)
        const parallelResult = await executor.run()

        // Store all results from parallel execution
        stepResults.push(...parallelResult.results)

        // Check if any step failed
        if (!parallelResult.ok) {
          // Get traces and metrics
          const trace = getRecentTraces(50)
          const metrics = getAllMetrics()

          return {
            ok: false,
            steps: stepResults,
            failedAt: `parallel_block_${i}`,
            context,
            trace,
            metrics,
          }
        }

        // Use the first successful result's data as context for next step
        // Or merge all results if needed
        const firstSuccess = parallelResult.results.find((r) => r.ok)
        if (firstSuccess) {
          context = firstSuccess.data
        }
      } else {
        // Sequential step: run normally via PipelineOrchestrator
        const sequentialOrchestrator = new PipelineOrchestrator([step])
        const sequentialResult = await sequentialOrchestrator.run(context)

        // Extract AgentResult from first step
        if (sequentialResult.steps.length > 0) {
          stepResults.push(sequentialResult.steps[0])
        }

        // Check if step failed
        if (!sequentialResult.ok) {
          return {
            ok: false,
            steps: stepResults,
            failedAt: step.name,
            context: sequentialResult.context,
            trace: sequentialResult.trace,
            metrics: sequentialResult.metrics,
          }
        }

        // Step succeeded - extract data for next step
        context = sequentialResult.context
      }
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
      name: "ParallelPipeline",
      version: "1.0.0",
      description: "Pipeline with mixed parallel and sequential execution",
      stepCount: this.steps.length,
      steps: this.steps.map((step, idx) =>
        Array.isArray(step)
          ? `parallel_block_${idx}(${step.length} steps)`
          : step.name,
      ),
    }
  }
}

