export interface DeliverabilityWindowStats {
  delivered: number
  sent: number
  bounced: number
  complained: number
}

export interface DeliverabilityAlertThresholds {
  minimumVolume: number
  bounceRatePercent: number
  complaintRatePercent: number
}

export interface DeliverabilityAssessment {
  shouldAlert: boolean
  reason: "bounce_rate" | "complaint_rate" | null
  total: number
  bounceRatePercent: number
  complaintRatePercent: number
}

function safeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

export function assessDeliverabilityWindow(
  stats: DeliverabilityWindowStats,
  thresholds: DeliverabilityAlertThresholds,
): DeliverabilityAssessment {
  const delivered = safeCount(stats.delivered)
  const sent = safeCount(stats.sent)
  const bounced = safeCount(stats.bounced)
  const complained = safeCount(stats.complained)
  const total = delivered + sent + bounced + complained
  const bounceRatePercent = total > 0 ? (bounced / total) * 100 : 0
  const complaintRatePercent = total > 0 ? (complained / total) * 100 : 0
  const hasEnoughVolume = total >= Math.max(1, safeCount(thresholds.minimumVolume))
  const reason = !hasEnoughVolume
    ? null
    : complaintRatePercent >= thresholds.complaintRatePercent
      ? "complaint_rate"
      : bounceRatePercent >= thresholds.bounceRatePercent
        ? "bounce_rate"
        : null

  return {
    shouldAlert: reason !== null,
    reason,
    total,
    bounceRatePercent,
    complaintRatePercent,
  }
}
