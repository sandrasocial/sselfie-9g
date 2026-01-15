// Credit system utilities

import { neon } from "@neondatabase/serverless"

const getDatabase = () => {
  if (!process.env.DATABASE_URL) {
    console.log("[v0] [CREDITS] DATABASE_URL not available - database operations will be skipped")
    return null
  }
  return neon(process.env.DATABASE_URL)
}

const sql = getDatabase()

export const CREDIT_COSTS = {
  TRAINING: 20, // $3.00 / $0.15 per credit (actual API cost)
  IMAGE: 1, // $0.15 per credit (actual API cost)
  ANIMATION: 3, // Video/B-roll generation (cost TBD)
} as const

// NOTE: Credits are priced at cost ($0.15/credit). Profit comes from subscription pricing, not credit markup.
// See docs/CREDIT-COST-AUDIT.md for detailed cost analysis.

export const SUBSCRIPTION_CREDITS = {
  sselfie_studio_membership: 200, // Creator Studio: 200 credits/month (~100 Pro photos OR ~200 Classic photos, fair use: ~4 photoshoots/month)
  one_time_session: 50, // Starter Photoshoot: 50 credits (one-time grant, 50 images)
} as const

export type TransactionType =
  | "purchase"
  | "subscription_grant"
  | "training"
  | "image"
  | "animation"
  | "refund"
  | "bonus"

/**
 * Check if user has enough credits for an action
 */
export async function checkCredits(userId: string, requiredAmount: number): Promise<boolean> {
  if (!sql) {
    console.log("[v0] [CREDITS] Database not available - allowing action in preview mode")
    return true
  }

  console.log("[v0] [CREDITS] Checking credits for user:", userId)
  console.log("[v0] [CREDITS] Required amount:", requiredAmount)

  const hasUnlimitedAccess = await hasUnlimitedCredits(userId)
  if (hasUnlimitedAccess) {
    console.log("[v0] [CREDITS] User has unlimited credits (elite plan or high balance)")
    return true
  }

  const currentBalance = await getUserCredits(userId)
  console.log("[v0] [CREDITS] Credit check result:", {
    userId,
    currentBalance,
    requiredAmount,
    hasEnough: currentBalance >= requiredAmount,
  })
  return currentBalance >= requiredAmount
}

/**
 * Check if user has unlimited credits (studio membership with high balance)
 */
async function hasUnlimitedCredits(userId: string): Promise<boolean> {
  if (!sql) return false

  try {
    const currentBalance = await getUserCredits(userId)
    if (currentBalance >= 999999) {
      console.log("[v0] [CREDITS] User has unlimited credit balance:", currentBalance)
      return true
    }

    const subscriptionResult = await sql`
      SELECT product_type, status FROM subscriptions 
      WHERE user_id = ${userId} 
      AND status = 'active'
      LIMIT 1
    `

    if (subscriptionResult.length > 0 && subscriptionResult[0].product_type === "sselfie_studio_membership") {
      console.log("[v0] [CREDITS] User has active studio membership - generous credit allocation")
      return false // Studio members still use credits, but get 150/month
    }

    return false
  } catch (error) {
    console.error("[v0] [CREDITS] Error checking unlimited credits:", error)
    return false
  }
}

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<number> {
  if (!sql) {
    console.log("[v0] [CREDITS] Database not available - returning 0 credits")
    return 0
  }

  console.log("[v0] [CREDITS] Getting credits for user:", userId)

  const result = await sql`
    SELECT balance FROM user_credits WHERE user_id = ${userId}
  `

  console.log("[v0] [CREDITS] Query result:", result)

  if (result.length === 0) {
    console.log("[v0] [CREDITS] No credits record found, initializing with 0")
    await sql`
      INSERT INTO user_credits (user_id, balance, total_purchased, total_used)
      VALUES (${userId}, 0, 0, 0)
      ON CONFLICT (user_id) DO NOTHING
    `
    return 0
  }

  const balance = Number(result[0].balance)
  console.log("[v0] [CREDITS] Current balance:", balance)
  return balance
}

/**
 * Add credits to user's balance (purchase or grant)
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: "purchase" | "subscription_grant" | "bonus",
  description: string,
  stripePaymentId?: string,
  isTestMode = false,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  if (!sql) {
    console.log("[v0] [CREDITS] Database not available - skipping add credits")
    return { success: false, newBalance: 0, error: "Database not available" }
  }

  try {
    console.log("[v0] [CREDITS] Adding credits:", {
      userId,
      amount,
      type,
      description,
      stripePaymentId,
      isTestMode,
    })

    let currentBalance = 0
    try {
      currentBalance = await getUserCredits(userId)
      console.log("[v0] [CREDITS] Current balance before adding:", currentBalance)
    } catch (balanceError) {
      console.error("[v0] [CREDITS] Error getting current balance, will initialize:", balanceError)
      // If user doesn't exist, we'll create them with the new balance
      currentBalance = 0
    }

    const newBalance = currentBalance + amount

    await sql`
      INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
      VALUES (${userId}, ${newBalance}, ${amount}, 0, NOW(), NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = ${newBalance},
        total_purchased = user_credits.total_purchased + ${amount},
        updated_at = NOW()
    `

    console.log("[v0] [CREDITS] Updated balance in database")

    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description, 
        stripe_payment_id, balance_after, is_test_mode, created_at
      )
      VALUES (
        ${userId}, ${amount}, ${type}, ${description},
        ${stripePaymentId || null}, ${newBalance}, ${isTestMode}, NOW()
      )
    `

    console.log("[v0] [CREDITS] Recorded transaction in database (test mode:", isTestMode, ")")
    console.log("[v0] [CREDITS] Successfully added credits. New balance:", newBalance)

    try {
      const { invalidateCreditCache } = await import("./credits-cached")
      await invalidateCreditCache(userId)
    } catch (cacheError) {
      console.warn("[v0] [CREDITS] Failed to invalidate cache, but credits were added:", cacheError)
    }

    return { success: true, newBalance }
  } catch (error) {
    console.error("[v0] [CREDITS] Error adding credits:", error)

    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes("Too Many") || errorMessage.includes("rate limit")) {
      return {
        success: false,
        newBalance: 0,
        error: "Database rate limit reached. Please wait a moment and try again.",
      }
    }

    return { success: false, newBalance: 0, error: "Failed to add credits. Please try again." }
  }
}

/**
 * Deduct credits from user's balance (usage)
 */
export async function deductCredits(
  userId: string,
  amount: number,
  type: "training" | "image" | "animation" | "refund",
  description: string,
  referenceId?: string,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  if (!sql) {
    console.log("[v0] [CREDITS] Database not available - allowing action in preview mode")
    return { success: true, newBalance: 0 }
  }

  try {
    console.log("[v0] [CREDITS] Deducting credits:", {
      userId,
      amount,
      type,
      description,
    })

    const hasUnlimitedAccess = await hasUnlimitedCredits(userId)
    if (hasUnlimitedAccess) {
      const currentBalance = await getUserCredits(userId)
      console.log("[v0] [CREDITS] User has unlimited credits - skipping deduction")
      return { success: true, newBalance: currentBalance }
    }

    // Atomic credit deduction using UPDATE with WHERE clause
    // This prevents race conditions without requiring interactive transactions
    let attempts = 0
    const maxAttempts = 3
    let success = false
    let finalBalance = 0
    let finalError: string | undefined

    while (attempts < maxAttempts && !success) {
      try {
        // Optimistic check (not locked, but helps avoid unnecessary UPDATE attempts)
        const currentBalance = await getUserCredits(userId)
        
        if (currentBalance < amount) {
          return {
            success: false,
            newBalance: currentBalance,
            error: `Insufficient credits. You have ${currentBalance} credits but need ${amount}.`,
          }
        }
        
        // Atomic UPDATE: only succeeds if balance >= amount
        // This prevents race condition - if two requests run concurrently,
        // only one will succeed (the one that sees balance >= amount)
        const updateResult = await sql`
          UPDATE user_credits
          SET 
            balance = balance - ${amount},
            total_used = total_used + ${amount},
            updated_at = NOW()
          WHERE user_id = ${userId}
            AND balance >= ${amount}
          RETURNING balance
        `
        
        // If UPDATE affected 0 rows, either:
        // 1. Balance was insufficient (shouldn't happen after check, but possible with race)
        // 2. Concurrent update changed balance between check and update
        if (updateResult.length === 0) {
          attempts++
          
          // Re-check balance to determine reason
          const recheckBalance = await getUserCredits(userId)
          
          if (recheckBalance < amount) {
            // Insufficient credits (race condition: another request deducted first)
            return {
              success: false,
              newBalance: recheckBalance,
              error: `Insufficient credits. You have ${recheckBalance} credits but need ${amount}.`,
            }
          }
          
          // Concurrent update detected - retry
          if (attempts < maxAttempts) {
            const delayMs = 100 * Math.pow(2, attempts - 1) // 100ms, 200ms, 400ms
            console.log(`[v0] [CREDITS] ⏳ Concurrent update detected, retrying in ${delayMs}ms...`)
            await new Promise(resolve => setTimeout(resolve, delayMs))
            continue // Retry
          } else {
            finalError = `Failed to deduct credits after ${maxAttempts} attempts due to concurrent updates`
            console.error("[v0] [CREDITS] ❌ All retry attempts exhausted")
            break
          }
        }
        
        // UPDATE succeeded - get new balance
        const newBalance = updateResult[0].balance
        
        // Record transaction (after successful UPDATE)
        // ⚠️ RISK: If INSERT fails here, credits are deducted but no ledger record exists
        // This is rare but possible. Mitigation: Log error prominently, repair tool available
        try {
          await sql`
            INSERT INTO credit_transactions (
              user_id, amount, transaction_type, description, 
              reference_id, balance_after
            )
            VALUES (
              ${userId}, ${-amount}, ${type}, ${description},
              ${referenceId || null}, ${newBalance}
            )
          `
        } catch (insertError: any) {
          // Credits already deducted, but transaction log failed
          // Log prominently for manual repair if needed
          console.error(`[v0] [CREDITS] ❌ CRITICAL: Credits deducted but transaction log failed:`, {
            userId,
            amount,
            newBalance,
            error: insertError.message,
            referenceId,
          })
          // Continue - credits are deducted, user can use them
          // Admin can repair transaction log later using repair tool
        }
        
        finalBalance = newBalance
        success = true
        
        console.log("[v0] [CREDITS] ✅ Credits deducted successfully. New balance:", newBalance)
        
        const { invalidateCreditCache } = await import("./credits-cached")
        await invalidateCreditCache(userId)
        
      } catch (error: any) {
        attempts++
        console.error(`[v0] [CREDITS] ❌ Deduction attempt ${attempts} failed:`, error.message)
        
        if (attempts >= maxAttempts) {
          finalError = `Failed to deduct credits after ${maxAttempts} attempts: ${error.message}`
          console.error("[v0] [CREDITS] ❌ All retry attempts exhausted")
        } else {
          // Exponential backoff: 100ms, 200ms, 400ms
          const delayMs = 100 * Math.pow(2, attempts - 1)
          console.log(`[v0] [CREDITS] ⏳ Retrying in ${delayMs}ms...`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      }
    }

    if (!success) {
      return { success: false, newBalance: 0, error: finalError || "Failed to deduct credits" }
    }

    return { success: true, newBalance: finalBalance }
  } catch (error) {
    console.error("[v0] [CREDITS] ❌ Error deducting credits:", error)
    return { success: false, newBalance: 0, error: "Failed to deduct credits" }
  }
}

/**
 * Get user's credit transaction history
 */
export async function getCreditHistory(userId: string, limit = 50) {
  if (!sql) {
    console.log("[v0] [CREDITS] Database not available - returning empty history")
    return []
  }

  const transactions = await sql`
    SELECT 
      id, amount, transaction_type, description, 
      reference_id, balance_after, created_at
    FROM credit_transactions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return transactions
}

/**
 * Grant monthly subscription credits
 * Updated to use new product types
 */
export async function grantMonthlyCredits(
  userId: string,
  productType: "sselfie_studio_membership",
  isTestMode = false,
) {
  const credits = SUBSCRIPTION_CREDITS[productType]

  const productName = "Creator Studio"

  return await addCredits(
    userId,
    credits,
    "subscription_grant",
    `Monthly ${productName} grant`,
    undefined,
    isTestMode,
  )
}

/**
 * Grant one-time session credits
 * New function for one-time session purchases
 */
export async function grantOneTimeSessionCredits(
  userId: string,
  stripePaymentId?: string,
  isTestMode = false
) {
  const credits = SUBSCRIPTION_CREDITS.one_time_session

  if (!stripePaymentId) {
    console.warn('[Credits] ⚠️ grantOneTimeSessionCredits called without stripe_payment_id')
  }

  return await addCredits(userId, credits, "purchase", "One-Time SSELFIE Session purchase", stripePaymentId, isTestMode)
}

/**
 * Grant free user credits (2 credits for blueprint access)
 * Decision 1: Credit System for All Users
 * Called on signup for free users
 */
export async function grantFreeUserCredits(userId: string): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const credits = 2 // Free users get 2 credits (enough for 1 grid = 2 images × 1 credit)

  console.log("[Credits] Granting free user credits:", { userId, credits })

  return await addCredits(
    userId,
    credits,
    "bonus",
    "Free blueprint credits (welcome bonus)",
    undefined,
    false,
  )
}

/**
 * Grant paid blueprint credits (60 credits for 30 images)
 * Decision 1: Credit System for All Users
 * Called from Stripe webhook on paid blueprint purchase
 * Paid Blueprint Package: 3 feed planners, 30 images total (2 credits per image)
 */
export async function grantPaidBlueprintCredits(
  userId: string,
  stripePaymentId?: string,
  isTestMode = false
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const credits = 60 // Paid blueprint users get 60 credits (30 images × 2 credits per image)

  if (!stripePaymentId) {
    console.warn('[Credits] ⚠️ grantPaidBlueprintCredits called without stripe_payment_id')
  }

  console.log("[Credits] Granting paid blueprint credits:", { userId, credits, stripePaymentId, isTestMode })

  return await addCredits(
    userId,
    credits,
    "purchase",
    "Paid Blueprint purchase (60 credits - 30 images)",
    stripePaymentId,
    isTestMode,
  )
}
