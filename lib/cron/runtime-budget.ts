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
  process: (item: T) => Promise<void>
}): Promise<{ processed: number; stoppedForBudget: boolean }> {
  let processed = 0

  for (const item of items) {
    if (!budget.canStart(minimumRemainingMs)) {
      return { processed, stoppedForBudget: true }
    }

    await process(item)
    processed += 1
  }

  return { processed, stoppedForBudget: false }
}
