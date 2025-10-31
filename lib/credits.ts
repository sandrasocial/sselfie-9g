// Credit system utilities

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const CREDIT_COSTS = {
  training: 25, // $5 / $0.20 per credit
  image: 1, // $0.20
  animation: 2.5, // $0.50 (stored as 3 for integer math)
} as const

export const SUBSCRIPTION_CREDITS = {
  starter: 100,
  pro: 250,
  elite: 600,
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
  const currentBalance = await getUserCredits(userId)
  return currentBalance >= requiredAmount
}

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<number> {
  const result = await sql`
    SELECT balance FROM user_credits WHERE user_id = ${userId}
  `

  if (result.length === 0) {
    // Initialize user credits if they don't exist
    await sql`
      INSERT INTO user_credits (user_id, balance)
      VALUES (${userId}, 0)
      ON CONFLICT (user_id) DO NOTHING
    `
    return 0
  }

  return result[0].balance
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
): Promise<{ success: boolean; newBalance: number }> {
  try {
    // Get current balance
    const currentBalance = await getUserCredits(userId)
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

    // Record transaction
    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description, 
        stripe_payment_id, balance_after
      )
      VALUES (
        ${userId}, ${amount}, ${type}, ${description},
        ${stripePaymentId || null}, ${newBalance}
      )
    `

    return { success: true, newBalance }
  } catch (error) {
    console.error("[v0] Error adding credits:", error)
    return { success: false, newBalance: 0 }
  }
}

/**
 * Deduct credits from user's balance (usage)
 */
export async function deductCredits(
  userId: string,
  amount: number,
  type: "training" | "image" | "animation",
  description: string,
  referenceId?: string,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    // Get current balance
    const currentBalance = await getUserCredits(userId)

    // Check if user has enough credits
    if (currentBalance < amount) {
      return {
        success: false,
        newBalance: currentBalance,
        error: `Insufficient credits. You have ${currentBalance} credits but need ${amount}.`,
      }
    }

    const newBalance = currentBalance - amount

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

    return { success: true, newBalance }
  } catch (error) {
    console.error("[v0] Error deducting credits:", error)
    return { success: false, newBalance: 0, error: "Failed to deduct credits" }
  }
}

/**
 * Get user's credit transaction history
 */
export async function getCreditHistory(userId: string, limit = 50) {
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
 */
export async function grantMonthlyCredits(userId: string, tier: "starter" | "pro" | "elite") {
  const credits = SUBSCRIPTION_CREDITS[tier]

  return await addCredits(userId, credits, "subscription_grant", `Monthly ${tier} subscription grant`)
}
