export type LaunchConversionOps = {
  applications90d: number
  qualified90d: number
  callsBooked90d: number
  offersSent90d: number
  closedWon90d: number
  cashCollected90dCents: string
  newMemberships30d: number
  churnedMemberships30d: number
  churn30dPct: number
  activeMembershipsNow: number
}

const DEFAULT_LAUNCH_CONVERSION_OPS: LaunchConversionOps = {
  applications90d: 0,
  qualified90d: 0,
  callsBooked90d: 0,
  offersSent90d: 0,
  closedWon90d: 0,
  cashCollected90dCents: "0",
  newMemberships30d: 0,
  churnedMemberships30d: 0,
  churn30dPct: 0,
  activeMembershipsNow: 0,
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "string" ? Number(value) : value
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback
}

function asCentsString(value: unknown, fallback = "0"): string {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed && /^-?\d+$/.test(trimmed)) return trimmed
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? Math.round(parsed).toString() : fallback
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value).toString()
  }

  return fallback
}

export function getSafeLaunchConversionOps(payload: unknown): LaunchConversionOps {
  const source =
    typeof payload === "object" && payload !== null && "conversionOps" in payload
      ? (payload as { conversionOps?: Record<string, unknown> }).conversionOps
      : undefined

  if (!source || typeof source !== "object") {
    return { ...DEFAULT_LAUNCH_CONVERSION_OPS }
  }

  return {
    applications90d: asFiniteNumber(source.applications90d),
    qualified90d: asFiniteNumber(source.qualified90d),
    callsBooked90d: asFiniteNumber(source.callsBooked90d),
    offersSent90d: asFiniteNumber(source.offersSent90d),
    closedWon90d: asFiniteNumber(source.closedWon90d),
    cashCollected90dCents: asCentsString(source.cashCollected90dCents),
    newMemberships30d: asFiniteNumber(source.newMemberships30d),
    churnedMemberships30d: asFiniteNumber(source.churnedMemberships30d),
    churn30dPct: asFiniteNumber(source.churn30dPct),
    activeMembershipsNow: asFiniteNumber(source.activeMembershipsNow),
  }
}
