const ADMIN_EMAIL = "ssa@ssasocial.com"

export function getAccessState({
  credits,
  subscriptionStatus,
  productType,
  userEmail,
  userRole,
}: {
  credits: number
  subscriptionStatus: string | null
  productType?: string | null
  userEmail?: string | null
  userRole?: string | null
}) {
  // Admin users get full access regardless of subscription status
  const normalizedRole = userRole?.toLowerCase() || null
  const isAdmin = normalizedRole === "admin" || userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  
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
      isMember: false,
      canUseGenerators: true, // Paid blueprint = 60 credits for 30 Maya photos. API enforces credit limits.
      showUpgradeUI: true, // Show upsell to membership (for more credits, monthly access)
      isPaidBlueprintOnly: true,
      hasFullAccess: false,
    }
  }

  // Free users: allow Maya access while they have bonus credits.
  // The API deducts credits and returns 402 when exhausted — that triggers the upgrade modal.
  // Hard-blocking the tab before they try creates a wall before the value is demonstrated.
  const hasCredits = credits > 0
  return {
    isMember: false,
    canUseGenerators: hasCredits, // Gate by credits, not by subscription tier
    showUpgradeUI: true,
    isPaidBlueprintOnly: false,
    hasFullAccess: false,
  }
}
