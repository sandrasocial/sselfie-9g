export interface MembershipPromoPolicyInput {
  duration?: string | null
  percentOff?: number | null
}

const BLOCKED_FOREVER_DISCOUNT_PERCENT = Number(
  process.env.MEMBERSHIP_BLOCKED_FOREVER_DISCOUNT_PERCENT || "50",
)

export function isMembershipPromoAllowed(input: MembershipPromoPolicyInput): boolean {
  const duration = (input.duration || "").toLowerCase()
  const percentOff = Number(input.percentOff || 0)

  if (duration !== "forever") {
    return true
  }

  if (!Number.isFinite(percentOff)) {
    return true
  }

  return percentOff < BLOCKED_FOREVER_DISCOUNT_PERCENT
}

export function getMembershipPromoBlockReason(input: MembershipPromoPolicyInput): string | null {
  if (isMembershipPromoAllowed(input)) {
    return null
  }

  return "This lifetime membership discount is no longer available. Use the current offer."
}
