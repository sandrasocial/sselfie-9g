export interface ActivationWindowInput {
  windowDays: number
  newSignups: number
  starts: number
  completes: number
  completesWithin5m: number
  completesWithin60m: number
  ttfiSecondsSamples: number[]
  periodStart: string
  periodEnd: string
}

export interface ActivationKpiReport {
  windowDays: number
  periodStart: string
  periodEnd: string
  metrics: {
    newSignups: number
    starts: number
    completes: number
    completesWithin5m: number
    completesWithin60m: number
    medianTtfiSeconds: number | null
    medianTtfiMinutes: number | null
  }
  rates: {
    startCoveragePct: number
    completionFromStartsPct: number
    activation5mFromStartsPct: number
    activation60mFromStartsPct: number
    activation60mFromSignupsPct: number
  }
}

function clampCount(value: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return Math.round(numeric)
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Number(((numerator / denominator) * 100).toFixed(1))
}

function computeMedian(samples: number[]): number | null {
  const clean = samples
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b)

  if (clean.length === 0) return null

  const middle = Math.floor(clean.length / 2)
  if (clean.length % 2 === 0) {
    return Math.round((clean[middle - 1] + clean[middle]) / 2)
  }
  return Math.round(clean[middle])
}

export function buildActivationKpiFromWindow(input: ActivationWindowInput): ActivationKpiReport {
  const newSignups = clampCount(input.newSignups)
  const starts = clampCount(input.starts)
  const completes = clampCount(input.completes)
  const completesWithin5m = clampCount(input.completesWithin5m)
  const completesWithin60m = clampCount(input.completesWithin60m)
  const medianTtfiSeconds = computeMedian(input.ttfiSecondsSamples || [])

  return {
    windowDays: clampCount(input.windowDays) || 7,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    metrics: {
      newSignups,
      starts,
      completes,
      completesWithin5m,
      completesWithin60m,
      medianTtfiSeconds,
      medianTtfiMinutes:
        medianTtfiSeconds === null ? null : Number((medianTtfiSeconds / 60).toFixed(2)),
    },
    rates: {
      startCoveragePct: toPercent(starts, newSignups),
      completionFromStartsPct: toPercent(completes, starts),
      activation5mFromStartsPct: toPercent(completesWithin5m, starts),
      activation60mFromStartsPct: toPercent(completesWithin60m, starts),
      activation60mFromSignupsPct: toPercent(completesWithin60m, newSignups),
    },
  }
}
