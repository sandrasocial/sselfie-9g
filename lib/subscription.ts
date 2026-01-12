import { sql } from "@/lib/neon"

export type ProductType = "sselfie_studio_membership" | "paid_blueprint" | "free_blueprint"
export type SubscriptionStatus = "active" | "canceled" | "expired"

/**
 * Get user's active product/subscription
 * Returns the product type and status
 */
export async function getUserSubscription(userId: string) {
  try {
    console.log(`[v0] [getUserSubscription] Looking up subscription for user: ${userId}`)

    const subscriptions = await sql`
      SELECT 
        product_type,
        status,
        stripe_subscription_id,
        current_period_start,
        current_period_end,
        created_at
      FROM subscriptions 
      WHERE user_id = ${userId} 
      AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `

    console.log(`[v0] [getUserSubscription] Found ${subscriptions.length} active subscription(s)`)

    if (subscriptions.length > 0) {
      console.log(`[v0] [getUserSubscription] Subscription details:`, {
        product_type: subscriptions[0].product_type,
        status: subscriptions[0].status,
        stripe_subscription_id: subscriptions[0].stripe_subscription_id,
        current_period_start: subscriptions[0].current_period_start,
        current_period_end: subscriptions[0].current_period_end,
      })
      return subscriptions[0]
    }

    console.log(`[v0] [getUserSubscription] No active subscription found for user ${userId}`)
    const allSubscriptions = await sql`
      SELECT 
        product_type,
        status,
        stripe_subscription_id,
        created_at
      FROM subscriptions 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `
    console.log(
      `[v0] [getUserSubscription] DEBUG: User has ${allSubscriptions.length} total subscription(s) in database:`,
      allSubscriptions,
    )
    return null
  } catch (error) {
    console.error("[v0] [getUserSubscription] Error getting user subscription:", error)
    return null
  }
}

/**
 * Check if user has active Studio Membership
 */
export async function hasStudioMembership(userId: string): Promise<boolean> {
  try {
    console.log(`[v0] [hasStudioMembership] Checking Studio Membership for user: ${userId}`)
    const subscription = await getUserSubscription(userId)
    const hasAccess = subscription?.product_type === "sselfie_studio_membership" && subscription?.status === "active"
    console.log(`[v0] [hasStudioMembership] Result: ${hasAccess}`)
    return hasAccess
  } catch (error) {
    console.error("[v0] [hasStudioMembership] Error checking studio membership:", error)
    return false
  }
}

/**
 * Check if user has purchased a one-time session
 * @deprecated One-time sessions are no longer tracked in subscriptions table
 * Check user credits instead via getUserCredits()
 */
export async function hasOneTimeSession(userId: string): Promise<boolean> {
  console.log("[v0] hasOneTimeSession is deprecated - one-time sessions are not subscriptions")
  return false
}

/**
 * Get user's product access level
 * Returns: null (no access) or 'sselfie_studio_membership'
 * Note: One-time sessions are NOT subscriptions and won't appear here
 */
export async function getUserProductAccess(userId: string): Promise<ProductType | null> {
  try {
    const subscription = await getUserSubscription(userId)

    if (!subscription) {
      return null
    }

    return subscription.product_type as ProductType
  } catch (error) {
    console.error("[v0] Error getting user product access:", error)
    return null
  }
}

/**
 * Check if user has access to Academy content
 * Only Studio Membership users have access
 */
export async function hasAcademyAccess(userId: string): Promise<boolean> {
  return await hasStudioMembership(userId)
}

/**
 * Check if user has paid blueprint entitlement
 * Paid blueprint is a one-time purchase (not a subscription)
 * Admin users automatically have paid blueprint access
 * 
 * FIX 2: Check blueprint_subscribers.paid_blueprint_purchased (primary source)
 * Also check subscriptions table for backward compatibility
 */
export async function hasPaidBlueprint(userId: string): Promise<boolean> {
  try {
    console.log(`[v0] [hasPaidBlueprint] Checking paid blueprint for user: ${userId}`)
    
    // Check if user is admin first (admins automatically have paid blueprint access)
    const adminCheck = await sql`
      SELECT role FROM users WHERE id = ${userId} LIMIT 1
    `
    const isAdmin = adminCheck.length > 0 && adminCheck[0].role === "admin"
    
    if (isAdmin) {
      console.log(`[v0] [hasPaidBlueprint] User is admin - has paid blueprint access`)
      return true
    }
    
    // PRIMARY SOURCE: Check blueprint_subscribers table (one-time purchase)
    console.log(`[v0] [hasPaidBlueprint] Querying blueprint_subscribers for user_id: ${userId}`)
    const blueprintSubscriber = await sql`
      SELECT paid_blueprint_purchased, user_id, email
      FROM blueprint_subscribers
      WHERE user_id = ${userId}
      LIMIT 1
    `
    
    console.log(`[v0] [hasPaidBlueprint] blueprint_subscribers query result:`, {
      found: blueprintSubscriber.length > 0,
      recordCount: blueprintSubscriber.length,
      paid_blueprint_purchased: blueprintSubscriber.length > 0 ? blueprintSubscriber[0].paid_blueprint_purchased : null,
      user_id: blueprintSubscriber.length > 0 ? blueprintSubscriber[0].user_id : null,
      email: blueprintSubscriber.length > 0 ? blueprintSubscriber[0].email : null,
    })
    
    if (blueprintSubscriber.length > 0 && blueprintSubscriber[0].paid_blueprint_purchased === true) {
      console.log(`[v0] [hasPaidBlueprint] ✅ Found paid blueprint purchase in blueprint_subscribers`)
      return true
    }
    
    if (blueprintSubscriber.length > 0) {
      console.log(`[v0] [hasPaidBlueprint] ⚠️ blueprint_subscribers record exists but paid_blueprint_purchased = ${blueprintSubscriber[0].paid_blueprint_purchased}`)
    } else {
      console.log(`[v0] [hasPaidBlueprint] ⚠️ No blueprint_subscribers record found for user_id: ${userId}`)
      
      // FALLBACK: Try to find by email (in case record was created before user_id was linked)
      try {
        const userEmail = await sql`
          SELECT email FROM users WHERE id = ${userId} LIMIT 1
        `
        
        if (userEmail.length > 0 && userEmail[0].email) {
          console.log(`[v0] [hasPaidBlueprint] Trying email fallback: ${userEmail[0].email}`)
          const blueprintByEmail = await sql`
            SELECT paid_blueprint_purchased, user_id, email
            FROM blueprint_subscribers
            WHERE LOWER(email) = LOWER(${userEmail[0].email})
            AND paid_blueprint_purchased = TRUE
            LIMIT 1
          `
          
          console.log(`[v0] [hasPaidBlueprint] Email fallback result:`, {
            found: blueprintByEmail.length > 0,
            paid_blueprint_purchased: blueprintByEmail.length > 0 ? blueprintByEmail[0].paid_blueprint_purchased : null,
            user_id: blueprintByEmail.length > 0 ? blueprintByEmail[0].user_id : null,
          })
          
          if (blueprintByEmail.length > 0 && blueprintByEmail[0].paid_blueprint_purchased === true) {
            // Update the record to link user_id if it's missing
            if (!blueprintByEmail[0].user_id) {
              console.log(`[v0] [hasPaidBlueprint] 🔗 Linking blueprint_subscribers record to user_id: ${userId}`)
              await sql`
                UPDATE blueprint_subscribers
                SET user_id = ${userId}, updated_at = NOW()
                WHERE LOWER(email) = LOWER(${userEmail[0].email})
                AND paid_blueprint_purchased = TRUE
              `
            }
            console.log(`[v0] [hasPaidBlueprint] ✅ Found paid blueprint purchase by email fallback`)
            return true
          }
        }
      } catch (emailError: any) {
        console.error(`[v0] [hasPaidBlueprint] Error in email fallback:`, emailError.message)
      }
    }
    
    // FALLBACK: Check subscriptions table (for backward compatibility)
    const subscription = await getUserSubscription(userId)
    const hasAccess = subscription?.product_type === "paid_blueprint" && subscription?.status === "active"
    
    if (hasAccess) {
      console.log(`[v0] [hasPaidBlueprint] ✅ Found paid blueprint in subscriptions table (legacy)`)
      return true
    }
    
    console.log(`[v0] [hasPaidBlueprint] ❌ No paid blueprint found`)
    return false
  } catch (error) {
    console.error("[v0] [hasPaidBlueprint] Error checking paid blueprint:", error)
    return false
  }
}

/**
 * Check if user has free blueprint access
 * All authenticated users have free blueprint access (implicit entitlement)
 */
export async function hasFreeBlueprintAccess(userId: string): Promise<boolean> {
  // Free blueprint is implicit for all authenticated users
  // No subscription required
  return true
}

/**
 * Get blueprint entitlement details for a user
 * Returns entitlement type, usage status, and remaining quotas
 * Admin users automatically get paid blueprint access
 */
export async function getBlueprintEntitlement(userId: string): Promise<{
  type: "free" | "paid" | "studio"
  freeGridUsed: boolean
  paidGridsRemaining: number | null
}> {
  try {
    console.log(`[v0] [getBlueprintEntitlement] Getting entitlement for user: ${userId}`)

    // Check if user is admin first (admins get automatic paid blueprint access)
    const adminCheck = await sql`
      SELECT role FROM users WHERE id = ${userId} LIMIT 1
    `
    const isAdmin = adminCheck.length > 0 && adminCheck[0].role === "admin"
    
    if (isAdmin) {
      console.log(`[v0] [getBlueprintEntitlement] User is admin - granting paid blueprint access`)
      const blueprintState = await sql`
        SELECT paid_grids_generated 
        FROM blueprint_subscribers 
        WHERE user_id = ${userId} 
        LIMIT 1
      `
      const paidGridsGenerated = blueprintState.length > 0 ? (blueprintState[0].paid_grids_generated || 0) : 0
      const paidGridsRemaining = Math.max(0, 30 - paidGridsGenerated)
      
      return {
        type: "paid",
        freeGridUsed: false, // Admin users don't use free quota
        paidGridsRemaining: paidGridsRemaining,
      }
    }

    // Check for Studio Membership (highest tier)
    const hasStudio = await hasStudioMembership(userId)
    if (hasStudio) {
      console.log(`[v0] [getBlueprintEntitlement] User has Studio Membership`)
      // Studio members get unlimited blueprint access (or same as paid - 30 grids)
      // For now, treat as paid (30 grids)
      const blueprintState = await sql`
        SELECT paid_grids_generated 
        FROM blueprint_subscribers 
        WHERE user_id = ${userId} 
        LIMIT 1
      `
      const paidGridsGenerated = blueprintState.length > 0 ? (blueprintState[0].paid_grids_generated || 0) : 0
      const paidGridsRemaining = Math.max(0, 30 - paidGridsGenerated)
      
      return {
        type: "studio",
        freeGridUsed: false, // Studio members don't use free quota
        paidGridsRemaining: paidGridsRemaining,
      }
    }

    // Check for paid blueprint (one-time purchase)
    const hasPaid = await hasPaidBlueprint(userId)
    if (hasPaid) {
      console.log(`[v0] [getBlueprintEntitlement] User has paid blueprint`)
      const blueprintState = await sql`
        SELECT paid_grids_generated 
        FROM blueprint_subscribers 
        WHERE user_id = ${userId} 
        LIMIT 1
      `
      const paidGridsGenerated = blueprintState.length > 0 ? (blueprintState[0].paid_grids_generated || 0) : 0
      const paidGridsRemaining = Math.max(0, 30 - paidGridsGenerated)
      
      return {
        type: "paid",
        freeGridUsed: false, // Paid users don't use free quota
        paidGridsRemaining: paidGridsRemaining,
      }
    }

    // Free blueprint (default for all users)
    console.log(`[v0] [getBlueprintEntitlement] User has free blueprint access`)
    const blueprintState = await sql`
      SELECT free_grid_used_count, free_grid_used_at 
      FROM blueprint_subscribers 
      WHERE user_id = ${userId} 
      LIMIT 1
    `
    const freeGridUsed = blueprintState.length > 0 
      ? (blueprintState[0].free_grid_used_count > 0 || blueprintState[0].free_grid_used_at !== null)
      : false

    return {
      type: "free",
      freeGridUsed: freeGridUsed,
      paidGridsRemaining: null, // Not applicable for free users
    }
  } catch (error) {
    console.error("[v0] [getBlueprintEntitlement] Error getting entitlement:", error)
    // Default to free access on error
    return {
      type: "free",
      freeGridUsed: false,
      paidGridsRemaining: null,
    }
  }
}

/**
 * @deprecated Use getUserProductAccess() instead
 * Backward compatibility function for old tier-based system
 * Maps product types to legacy tier names
 */
export async function getUserTier(userId: string): Promise<string> {
  console.log("[v0] getUserTier is deprecated, using getUserProductAccess instead")
  const productType = await getUserProductAccess(userId)

  // Map new product types to legacy tier names for backward compatibility
  if (productType === "sselfie_studio_membership") {
    return "studio" // Map to a generic tier name
  }

  // Users with credits but no subscription are considered "session" tier for backwards compatibility
  return "free" // No active subscription
}
