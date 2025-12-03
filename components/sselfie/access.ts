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

  if (credits > 0) {
    return {
      isMember: false,
      canUseGenerators: true,
      showUpgradeUI: false,
    }
  }

  return {
    isMember: false,
    canUseGenerators: false,
    showUpgradeUI: true,
  }
}
