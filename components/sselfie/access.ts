export function getAccessState({
  credits,
  subscriptionStatus,
}: {
  credits: number
  subscriptionStatus: string | null
}) {
  const isMember = subscriptionStatus === "active" || subscriptionStatus === "trialing"

  if (isMember) {
    return {
      isMember: true,
      canUseGenerators: true,
      showUpgradeUI: false,
    }
  }

  // Free users (no subscription) should NOT have access to generators
  // Even if they have credits (2 credits are for testing feed planner only)
  // Only members/paid users can use generators
  return {
    isMember: false,
    canUseGenerators: false,
    showUpgradeUI: true,
  }
}
