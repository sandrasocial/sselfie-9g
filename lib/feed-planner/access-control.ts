/**
 * Feed Planner Access Control
 * 
 * Determines user access levels and feature availability for Feed Planner
 * Based on user's subscription type (free, paid blueprint, one-time session, membership)
 */

import { hasPaidBlueprint, hasFullAccess } from "@/lib/subscription"
import { getUserCredits } from "@/lib/credits"

export interface FeedPlannerAccess {
  isFree: boolean
  isPaidBlueprint: boolean
  isOneTime: boolean
  isMembership: boolean
  creditBalance: number
  canGenerateWithCredits: boolean
  hasGalleryAccess: boolean
  canGenerateImages: boolean
  canGenerateCaptions: boolean
  canGenerateStrategy: boolean
  canGenerateBio: boolean
  canGenerateHighlights: boolean
  maxFeedPlanners: number | null // null = unlimited
  placeholderType: "single" | "grid" // single = 9:16 placeholder, grid = 3x3
}

/**
 * Get Feed Planner access control for a user
 * 
 * Determines what features are available based on user's subscription type:
 * - Free: One 9:16 placeholder, generation allowed only while credits > 0, no gallery access
 * - Paid Blueprint: Full 3x3 grid, all generation buttons, gallery access, 3 feed planners max
 * - One-Time Session: Full 3x3 grid, all generation buttons, gallery access, unlimited feed planners
 * - Membership: Full 3x3 grid, all generation buttons, gallery access, unlimited feed planners
 * 
 * @param userId - User ID to check access for
 * @returns FeedPlannerAccess object with all access flags
 */
export async function getFeedPlannerAccess(userId: string): Promise<FeedPlannerAccess> {
  try {
    console.log(`[Feed Planner Access] Checking access for user: ${userId}`)

    // Check subscription types
    const hasPaid = await hasPaidBlueprint(userId)
    const hasMembership = await hasFullAccess(userId)
    const credits = await getUserCredits(userId)

    // Determine access level (order matters: membership > paid blueprint > free)
    // Note: Free users get 2 credits for testing feed planner, but are still "free" users
    // One-time sessions are deprecated - we only have free, paid blueprint, and membership now
    const isMembership = hasMembership
    const isPaidBlueprint = hasPaid && !hasMembership
    const isFree = !hasMembership && !hasPaid
    // One-time is deprecated - treat as free
    const isOneTime = false

    console.log(`[Feed Planner Access] Access level determined:`, {
      userId,
      isFree,
      isPaidBlueprint,
      isOneTime,
      isMembership,
      credits,
    })

    // Build access control object
    const access: FeedPlannerAccess = {
      isFree,
      isPaidBlueprint,
      isOneTime,
      isMembership,
      
      // Free users can generate while credits remain, but gallery remains paid-only.
      // This keeps freebie behavior aligned with API contract.
      creditBalance: Number(credits || 0),
      canGenerateWithCredits: isFree && Number(credits || 0) > 0,

      // Gallery access: Paid blueprint, membership, or one-time session
      hasGalleryAccess: isPaidBlueprint || isMembership || isOneTime,
      
      // Generation features:
      // - Paid and membership users always can generate
      // - Free users can generate while they still have credits
      canGenerateImages: isPaidBlueprint || isMembership || isOneTime || (isFree && Number(credits || 0) > 0),
      canGenerateCaptions: isPaidBlueprint || isMembership || isOneTime,
      canGenerateStrategy: isPaidBlueprint || isMembership || isOneTime,
      canGenerateBio: isPaidBlueprint || isMembership || isOneTime,
      canGenerateHighlights: isPaidBlueprint || isMembership || isOneTime,
      
      // Feed planner limits: Paid blueprint = 3, others = unlimited
      maxFeedPlanners: isPaidBlueprint ? 3 : null,
      
      // Placeholder type: Free = single 9:16, others = 3x3 grid
      placeholderType: isFree ? "single" : "grid",
    }

    console.log(`[Feed Planner Access] Access control determined:`, {
      userId,
      creditBalance: access.creditBalance,
      canGenerateWithCredits: access.canGenerateWithCredits,
      hasGalleryAccess: access.hasGalleryAccess,
      canGenerateImages: access.canGenerateImages,
      canGenerateCaptions: access.canGenerateCaptions,
      canGenerateStrategy: access.canGenerateStrategy,
      canGenerateBio: access.canGenerateBio,
      canGenerateHighlights: access.canGenerateHighlights,
      maxFeedPlanners: access.maxFeedPlanners,
      placeholderType: access.placeholderType,
    })

    return access
  } catch (error) {
    console.error("[Feed Planner Access] Error getting access control:", error)
    
    // Default to free access on error (safest fallback)
    return {
      isFree: true,
      isPaidBlueprint: false,
      isOneTime: false,
      isMembership: false,
      creditBalance: 0,
      canGenerateWithCredits: false,
      hasGalleryAccess: false,
      canGenerateImages: false,
      canGenerateCaptions: false,
      canGenerateStrategy: false,
      canGenerateBio: false,
      canGenerateHighlights: false,
      maxFeedPlanners: null,
      placeholderType: "single",
    }
  }
}
