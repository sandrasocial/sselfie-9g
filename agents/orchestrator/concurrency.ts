/**
 * Concurrency Control
 * Manages parallel execution limits and throttling
 */

export const CONCURRENCY_LIMIT = 5
export const QUEUE_INTERVAL = 50 // ms throttle to prevent DB spike

/**
 * Execute tasks with concurrency limit and throttling
 * @param tasks - Array of async functions to execute
 * @returns Array of results in the same order as tasks
 */
export async function throttle<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = []
  let index = 0

  async function worker() {
    while (index < tasks.length) {
      const current = index++
      try {
        const result = await tasks[current]()
        results[current] = result
      } catch (error) {
        results[current] = error as T
      }
      // Throttle to prevent database/API overload
      await new Promise((resolve) => setTimeout(resolve, QUEUE_INTERVAL))
    }
  }

  // Create worker pool
  const workers = Array(Math.min(CONCURRENCY_LIMIT, tasks.length))
    .fill(null)
    .map(() => worker())

  await Promise.all(workers)
  return results
}

/**
 * Check if tasks should be throttled
 */
export function shouldThrottle(taskCount: number): boolean {
  return taskCount > CONCURRENCY_LIMIT
}

