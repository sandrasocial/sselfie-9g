import { getUserCredits as getCreditsFromDb, getCreditHistory as getCreditHistoryFromDb } from "./credits"
import { getOrFetch, deleteCache, CACHE_TTL } from "./cache"

/**
 * Get user credits with caching
 */
export async function getUserCreditsCached(userId: string): Promise<number> {
  const cacheKey = `credits:${userId}`
  return getOrFetch(cacheKey, () => getCreditsFromDb(userId), CACHE_TTL.CREDITS)
}

/**
 * Check if user has enough credits with caching
 */
export async function checkCreditsCached(userId: string, amount: number): Promise<boolean> {
  const credits = await getUserCreditsCached(userId)
  return credits >= amount
}

/**
 * Get credit history with caching (5 minute cache)
 */
export async function getCreditHistory(userId: string, limit = 50) {
  const cacheKey = `credit_history:${userId}:${limit}`
  return getOrFetch(
    cacheKey,
    () => getCreditHistoryFromDb(userId, limit),
    CACHE_TTL.MEDIUM, // 5 minutes
  )
}

/**
 * Invalidate credit cache after transactions
 */
export async function invalidateCreditCache(userId: string): Promise<void> {
  await deleteCache(`credits:${userId}`)
  // Also invalidate credit history cache
  await deleteCache(`credit_history:${userId}:50`)
}
