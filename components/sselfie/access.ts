export function getAccessState({
  credits,
  subscriptionStatus,
  productType,
}: {
  credits: number
  subscriptionStatus: string | null
  productType?: string | null
}) {
  const isMember = subscriptionStatus === "active" || subscriptionStatus === "trialing"
  const isPaidBlueprintOnly = isMember && productType === "paid_blueprint"
  const isMembership = isMember && ["sselfie_studio_membership", "brand_studio_membership", "pro", "one_time_session"].includes(productType || "")

  if (isMembership) {
    return {
      isMember: true,
      canUseGenerators: true, // Membership = full access
      showUpgradeUI: false,
      isPaidBlueprintOnly: false,
    }
  }

  if (isPaidBlueprintOnly) {
    return {
      isMember: false, // Not a "member" in the traditional sense
      canUseGenerators: false, // Paid blueprint = Feed Planner only
      showUpgradeUI: true, // Show upgrade to membership
      isPaidBlueprintOnly: true,
    }
  }

  // Free users (no subscription) should NOT have access to generators
  // Even if they have credits (2 credits are for testing feed planner only)
  // Only members/paid users can use generators
  return {
    isMember: false,
    canUseGenerators: false,
    showUpgradeUI: true,
    isPaidBlueprintOnly: false,
  }
}
