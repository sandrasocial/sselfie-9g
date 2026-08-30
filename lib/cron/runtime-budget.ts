export interface RuntimeBudget {
  elapsedMs(): number
  remainingMs(): number
  canStart(minimumRemainingMs?: number): boolean
}

export function createRuntimeBudget(
  maxRuntimeMs: number,
  now: () => number = Date.now
): RuntimeBudget {
  const startedAt = now()

  return {
    elapsedMs: () => Math.max(0, now() - startedAt),
    remainingMs: () => Math.max(0, maxRuntimeMs - (now() - startedAt)),
    canStart: (minimumRemainingMs = 0) => now() - startedAt + minimumRemainingMs < maxRuntimeMs,
  }
}

export type RuntimeBudgetResult<T> =
  | { completed: true; value: T; stoppedForBudget: false; timedOut: false }
  | { completed: false; stoppedForBudget: true; timedOut: boolean }

export async function runWithRuntimeBudget<T>({
  budget,
  minimumRemainingMs,
  operation,
}: {
  budget: RuntimeBudget
  minimumRemainingMs: number
  operation: (signal: AbortSignal) => Promise<T>
}): Promise<RuntimeBudgetResult<T>> {
  if (!budget.canStart(minimumRemainingMs)) {
    return { completed: false, stoppedForBudget: true, timedOut: false }
  }

  const controller = new AbortController()
  const timeoutMarker = {}
  const timeoutMs = Math.max(1, budget.remainingMs())
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    const result = await Promise.race([
      operation(controller.signal),
      new Promise<typeof timeoutMarker>(resolve => {
        timeout = setTimeout(() => {
          controller.abort()
          resolve(timeoutMarker)
        }, timeoutMs)
      }),
    ])

    if (result === timeoutMarker) {
      return { completed: false, stoppedForBudget: true, timedOut: true }
    }

    return { completed: true, value: result as T, stoppedForBudget: false, timedOut: false }
  } finally {
    if (timeout) clearTimeout(timeout)
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
    const result = await runWithRuntimeBudget({
      budget,
      minimumRemainingMs,
      operation: signal => process(item, signal),
    })
    if (!result.completed) {
      return {
        processed,
        stoppedForBudget: result.stoppedForBudget,
        timedOut: result.timedOut,
      }
    }

    processed += 1
  }

  return { processed, stoppedForBudget: false, timedOut: false }
}
