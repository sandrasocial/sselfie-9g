export interface RuntimeBudget {
  elapsedMs(): number
  remainingMs(): number
  canStart(minimumRemainingMs?: number): boolean
}

export function createRuntimeBudget(
  maxRuntimeMs: number,
  now: () => number = Date.now,
): RuntimeBudget {
  const startedAt = now()

  return {
    elapsedMs: () => Math.max(0, now() - startedAt),
    remainingMs: () => Math.max(0, maxRuntimeMs - (now() - startedAt)),
    canStart: (minimumRemainingMs = 0) => now() - startedAt + minimumRemainingMs < maxRuntimeMs,
  }
}

export async function processWithRuntimeBudget<T>({
  items,
  budget,
  minimumRemainingMs,
  process,
}: {
  items: T[]
  budget: RuntimeBudget
  minimumRemainingMs: number
  process: (item: T, signal: AbortSignal) => Promise<void>
}): Promise<{ processed: number; stoppedForBudget: boolean; timedOut: boolean }> {
  let processed = 0

  for (const item of items) {
    if (!budget.canStart(minimumRemainingMs)) {
      return { processed, stoppedForBudget: true, timedOut: false }
    }

    const controller = new AbortController()
    const timeoutMs = Math.max(1, budget.remainingMs())
    let timeout: ReturnType<typeof setTimeout> | undefined

    try {
      await Promise.race([
        process(item, controller.signal),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort()
            reject(new Error("Cron runtime budget exhausted during work item"))
          }, timeoutMs)
        }),
      ])
    } catch (error) {
      if (controller.signal.aborted) {
        return { processed, stoppedForBudget: true, timedOut: true }
      }
      throw error
    } finally {
      if (timeout) clearTimeout(timeout)
    }

    processed += 1
  }

  return { processed, stoppedForBudget: false, timedOut: false }
}
