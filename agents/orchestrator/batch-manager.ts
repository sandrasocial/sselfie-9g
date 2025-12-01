/**
 * Batch Job Manager
 * Manages large batches of agent tasks with automatic chunking and concurrency control
 */

import { ParallelExecutor, type ParallelTask, type ParallelResult } from "./parallel"
import { CONCURRENCY_LIMIT } from "./concurrency"

export interface BatchResult {
  ok: boolean
  batches: ParallelResult[]
  totalTasks: number
  successfulTasks: number
  failedTasks: number
}

/**
 * BatchJobManager
 * Processes large batches of agent tasks by chunking and executing in parallel
 */
export class BatchJobManager {
  /**
   * Run a batch of tasks for a single agent
   * @param agentName - Name of the agent to run
   * @param inputs - Array of inputs for each task
   * @returns BatchResult with all batch results
   */
  async runBatch(agentName: string, inputs: unknown[]): Promise<BatchResult> {
    const tasks: ParallelTask[] = inputs.map((input) => ({
      agent: agentName,
      input,
    }))

    // If small batch, run directly
    if (tasks.length <= CONCURRENCY_LIMIT) {
      const result = await new ParallelExecutor(tasks).run()
      const successfulTasks = result.results.filter((r) => r.ok).length
      const failedTasks = result.results.filter((r) => !r.ok).length

      return {
        ok: result.ok,
        batches: [result],
        totalTasks: tasks.length,
        successfulTasks,
        failedTasks,
      }
    }

    // Large batch: chunk and process sequentially
    const chunks: ParallelTask[][] = []
    for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
      chunks.push(tasks.slice(i, i + CONCURRENCY_LIMIT))
    }

    const batchResults: ParallelResult[] = []
    for (const chunk of chunks) {
      const executor = new ParallelExecutor(chunk)
      const result = await executor.run()
      batchResults.push(result)
    }

    // Calculate totals
    const totalTasks = tasks.length
    const successfulTasks = batchResults.reduce(
      (sum, batch) => sum + batch.results.filter((r) => r.ok).length,
      0,
    )
    const failedTasks = totalTasks - successfulTasks

    return {
      ok: batchResults.every((batch) => batch.ok),
      batches: batchResults,
      totalTasks,
      successfulTasks,
      failedTasks,
    }
  }

  /**
   * Run multiple batches (different agents)
   * @param batches - Array of { agentName, inputs[] }
   */
  async runMultipleBatches(
    batches: Array<{ agentName: string; inputs: unknown[] }>,
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = []

    for (const batch of batches) {
      const result = await this.runBatch(batch.agentName, batch.inputs)
      results.push(result)
    }

    return results
  }
}

/**
 * Singleton instance for use across the application
 */
export const batchJobManager = new BatchJobManager()

