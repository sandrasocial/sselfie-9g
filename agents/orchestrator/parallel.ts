/**
 * Parallel Execution Engine
 * Executes multiple agents in parallel with concurrency control
 */

import { AgentRegistry } from "@/agents/core/agent-registry"
import type { AgentResult } from "@/agents/core/agent-result"
import { failure } from "@/agents/core/agent-result"
import { trace } from "@/agents/monitoring/tracer"
import { recordAgentCall, recordAgentDuration, recordAgentError } from "@/agents/monitoring/metrics"
import { getRecentTraces } from "@/agents/monitoring/tracer"
import { getAllMetrics } from "@/agents/monitoring/metrics"
import { throttle, shouldThrottle } from "./concurrency"

export interface ParallelTask {
  agent: string
  input?: unknown
}

export interface ParallelResult {
  ok: boolean
  results: AgentResult[]
  trace: any[]
  metrics: {
    calls: Record<string, number>
    errors: Record<string, number>
    durations: Record<string, number[]>
  }
}

/**
 * ParallelExecutor
 * Executes multiple agents in parallel with automatic concurrency control
 */
export class ParallelExecutor {
  constructor(private tasks: ParallelTask[]) {}

  /**
   * Run all tasks in parallel (with concurrency limits if needed)
   */
  async run(): Promise<ParallelResult> {
    const start = Date.now()

    // If we have more tasks than the concurrency limit, use throttling
    if (shouldThrottle(this.tasks.length)) {
      return this.runWithThrottle(start)
    }

    // Otherwise, run all in parallel
    return this.runParallel(start)
  }

  /**
   * Run tasks in parallel (no throttling needed)
   */
  private async runParallel(start: number): Promise<ParallelResult> {
    const promises = this.tasks.map(async (task) => {
      const instance = AgentRegistry.get(task.agent)

      if (!instance) {
        return failure(task.agent, new Error(`Agent not found: ${task.agent}`))
      }

      try {
        trace(task.agent, "parallel_start", task.input)
        recordAgentCall(task.agent)

        const taskStart = Date.now()
        const result = await instance.process(task.input ?? {})
        const duration = Date.now() - taskStart

        recordAgentDuration(task.agent, duration)
        trace(task.agent, "parallel_complete", result)

        return result
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err))
        recordAgentError(task.agent)
        trace(task.agent, "parallel_error", error)

        return failure(task.agent, error)
      }
    })

    const results = await Promise.all(promises)

    // Get traces and metrics
    const recentTraces = getRecentTraces(50)
    const allMetrics = getAllMetrics()

    return {
      ok: results.every((r) => r.ok),
      results,
      trace: recentTraces,
      metrics: allMetrics,
    }
  }

  /**
   * Run tasks with throttling (for large batches)
   */
  private async runWithThrottle(start: number): Promise<ParallelResult> {
    const taskFunctions = this.tasks.map((task) => async () => {
      const instance = AgentRegistry.get(task.agent)

      if (!instance) {
        return failure(task.agent, new Error(`Agent not found: ${task.agent}`))
      }

      try {
        trace(task.agent, "parallel_start", task.input)
        recordAgentCall(task.agent)

        const taskStart = Date.now()
        const result = await instance.process(task.input ?? {})
        const duration = Date.now() - taskStart

        recordAgentDuration(task.agent, duration)
        trace(task.agent, "parallel_complete", result)

        return result
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err))
        recordAgentError(task.agent)
        trace(task.agent, "parallel_error", error)

        return failure(task.agent, error)
      }
    })

    const results = await throttle(taskFunctions)

    // Get traces and metrics
    const recentTraces = getRecentTraces(50)
    const allMetrics = getAllMetrics()

    return {
      ok: results.every((r) => r.ok),
      results: results as AgentResult[],
      trace: recentTraces,
      metrics: allMetrics,
    }
  }
}

