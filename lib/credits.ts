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
  TRAINING: 25, // $5 / $0.20 per credit
  IMAGE: 1, // $0.20
  ANIMATION: 5, // Updated from 3 to 5 credits ($1.00) to match wan-2.5-i2v-fast cost (~$0.50) with healthy margin
} as const

export const SUBSCRIPTION_CREDITS = {
  sselfie_studio_membership: 150, // Studio membership gets 150 credits/month
  one_time_session: 70, // One-time session gets 70 credits (one-time grant)
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
): Promise<{ success: boolean; newBalance: number }> {
  if (!sql) {
    console.log("[v0] [CREDITS] Database not available - skipping add credits")
    return { success: false, newBalance: 0 }
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

    // Get current balance
    const currentBalance = await getUserCredits(userId)
    console.log("[v0] [CREDITS] Current balance before adding:", currentBalance)

    const newBalance = currentBalance + amount

    // Update balance
    await sql`
      UPDATE user_credits
      SET 
        balance = ${newBalance},
        total_purchased = total_purchased + ${amount},
        updated_at = NOW()
      WHERE user_id = ${userId}
    `

    console.log("[v0] [CREDITS] Updated balance in database")

    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description, 
        stripe_payment_id, balance_after, is_test_mode
      )
      VALUES (
        ${userId}, ${amount}, ${type}, ${description},
        ${stripePaymentId || null}, ${newBalance}, ${isTestMode}
      )
    `

    console.log("[v0] [CREDITS] Recorded transaction in database (test mode:", isTestMode, ")")
    console.log("[v0] [CREDITS] Successfully added credits. New balance:", newBalance)

    const { invalidateCreditCache } = await import("./credits-cached")
    await invalidateCreditCache(userId)

    return { success: true, newBalance }
  } catch (error) {
    console.error("[v0] [CREDITS] Error adding credits:", error)
    return { success: false, newBalance: 0 }
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

    // Get current balance
    const currentBalance = await getUserCredits(userId)
    console.log("[v0] [CREDITS] Current balance before deduction:", currentBalance)

    // Check if user has enough credits
    if (currentBalance < amount) {
      console.log("[v0] [CREDITS] Insufficient credits:", {
        currentBalance,
        required: amount,
        shortfall: amount - currentBalance,
      })
      return {
        success: false,
        newBalance: currentBalance,
        error: `Insufficient credits. You have ${currentBalance} credits but need ${amount}.`,
      }
    }

    const newBalance = currentBalance - amount

    console.log("[v0] [CREDITS] ⚠️ DEDUCTING CREDITS:", {
      userId,
      type,
      amount,
      currentBalance,
      newBalance,
      description,
      timestamp: new Date().toISOString(),
    })

    // Update balance
    await sql`
      UPDATE user_credits
      SET 
        balance = ${newBalance},
        total_used = total_used + ${amount},
        updated_at = NOW()
      WHERE user_id = ${userId}
    `

    // Record transaction (negative amount for usage)
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

    console.log("[v0] [CREDITS] ✅ Credits deducted successfully. New balance:", newBalance)

    const { invalidateCreditCache } = await import("./credits-cached")
    await invalidateCreditCache(userId)

    return { success: true, newBalance }
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

  return await addCredits(
    userId,
    credits,
    "subscription_grant",
    `Monthly ${productType === "sselfie_studio_membership" ? "Studio Membership" : "subscription"} grant`,
    undefined,
    isTestMode,
  )
}

/**
 * Grant one-time session credits
 * New function for one-time session purchases
 */
export async function grantOneTimeSessionCredits(userId: string, isTestMode = false) {
  const credits = SUBSCRIPTION_CREDITS.one_time_session

  return await addCredits(userId, credits, "purchase", "One-Time SSELFIE Session purchase", undefined, isTestMode)
}
