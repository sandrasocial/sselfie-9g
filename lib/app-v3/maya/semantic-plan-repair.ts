export interface SemanticPlanRepairRequest<T> {
  candidate: T
  errors: string[]
  attempt: number
}

export interface SemanticPlanRepairResult<T> {
  value: T
  attemptCount: number
  errorsFixed: string[]
}

/**
 * Small orchestration loop for a semantically invalid tool payload. The caller owns the
 * corrective model call; this helper owns the hard two-attempt ceiling and validation gate.
 */
export async function repairSemanticPlan<T>({
  initial,
  validate,
  requestRepair,
  maxAttempts = 2,
}: {
  initial: T
  validate: (candidate: T) => string[]
  requestRepair: (request: SemanticPlanRepairRequest<T>) => Promise<T | null>
  maxAttempts?: number
}): Promise<SemanticPlanRepairResult<T> | null> {
  let candidate = initial
  const errorsFixed = new Set<string>()

  for (let attempt = 1; attempt <= Math.max(0, maxAttempts); attempt += 1) {
    const errors = validate(candidate)
    if (errors.length === 0) {
      return { value: candidate, attemptCount: attempt - 1, errorsFixed: [...errorsFixed] }
    }
    errors.forEach(error => errorsFixed.add(error))
    const repaired = await requestRepair({ candidate, errors, attempt })
    if (!repaired) return null
    candidate = repaired
  }

  return validate(candidate).length === 0
    ? { value: candidate, attemptCount: maxAttempts, errorsFixed: [...errorsFixed] }
    : null
}
