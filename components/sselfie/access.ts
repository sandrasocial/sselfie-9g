const ADMIN_EMAIL = "ssa@ssasocial.com"

export function getAccessState({
  credits,
  subscriptionStatus,
  productType,
  userEmail,
}: {
  credits: number
  subscriptionStatus: string | null
  productType?: string | null
  userEmail?: string | null
}) {
  // Admin users get full access regardless of subscription status
  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  
  if (isAdmin) {
    return {
      isMember: true,
      canUseGenerators: true, // Admin = full access
      showUpgradeUI: false,
      isPaidBlueprintOnly: false,
      hasFullAccess: true, // Admin has access to everything including Academy
    }
  }

  const isMember = subscriptionStatus === "active" || subscriptionStatus === "trialing"
  const isPaidBlueprintOnly = productType === "paid_blueprint"
  const isMembership = isMember && ["sselfie_studio_membership", "brand_studio_membership", "pro", "one_time_session"].includes(productType || "")

  if (isMembership) {
    return {
      isMember: true,
      canUseGenerators: true, // Membership = full access
      showUpgradeUI: false,
      isPaidBlueprintOnly: false,
      hasFullAccess: ["sselfie_studio_membership", "brand_studio_membership", "pro"].includes(productType || ""), // Only Studio Membership has Academy
    }
  }

  if (isPaidBlueprintOnly) {
    return {
      isMember: false, // Not a "member" in the traditional sense
      canUseGenerators: false, // Paid blueprint = Feed Planner only
      showUpgradeUI: true, // Show upgrade to membership
      isPaidBlueprintOnly: true,
      hasFullAccess: false,
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
    hasFullAccess: false,
  }
}
