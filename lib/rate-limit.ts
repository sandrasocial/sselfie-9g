import { getRedisClient, CacheKeys, RateLimits } from "@/lib/redis"

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp when the limit resets
}

/**
 * Check and increment rate limit for training jobs
 */
export async function checkTrainingRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(userId, "training")
}

/**
 * Check and increment rate limit for image generation
 */
export async function checkGenerationRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(userId, "generation")
}

/**
 * Check and increment rate limit for video generation
 */
export async function checkVideoRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(userId, "video")
}

/**
 * Generic rate limit checker
 */
async function checkRateLimit(userId: string, type: "training" | "generation" | "video"): Promise<RateLimitResult> {
  try {
    const redis = getRedisClient()
    const config = RateLimits[type]

    let key: string
    switch (type) {
      case "training":
        key = CacheKeys.rateLimitTraining(userId)
        break
      case "generation":
        key = CacheKeys.rateLimitGeneration(userId)
        break
      case "video":
        key = CacheKeys.rateLimitVideo(userId)
        break
    }

    // Get current count
    const current = (await redis.get<number>(key)) || 0

    // Calculate reset time
    const ttl = await redis.ttl(key)
    const reset = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + config.window * 1000

    // Check if limit exceeded
    if (current >= config.max) {
      console.log(`[v0] Rate limit exceeded for ${type}:`, { userId, current, max: config.max })
      return {
        success: false,
        limit: config.max,
        remaining: 0,
        reset,
      }
    }

    // Increment counter
    const newCount = await redis.incr(key)

    // Set expiry if this is the first request in the window
    if (newCount === 1) {
      await redis.expire(key, config.window)
    }

    console.log(`[v0] Rate limit check passed for ${type}:`, {
      userId,
      count: newCount,
      max: config.max,
      remaining: config.max - newCount,
    })

    return {
      success: true,
      limit: config.max,
      remaining: config.max - newCount,
      reset,
    }
  } catch (error) {
    console.error("[v0] Error checking rate limit (allowing request):", error)
    // If Redis fails, allow the request (fail open)
    return {
      success: true,
      limit: RateLimits[type].max,
      remaining: RateLimits[type].max - 1,
      reset: Date.now() + RateLimits[type].window * 1000,
    }
  }
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  userId: string,
  type: "training" | "generation" | "video",
): Promise<RateLimitResult> {
  try {
    const redis = getRedisClient()
    const config = RateLimits[type]

    let key: string
    switch (type) {
      case "training":
        key = CacheKeys.rateLimitTraining(userId)
        break
      case "generation":
        key = CacheKeys.rateLimitGeneration(userId)
        break
      case "video":
        key = CacheKeys.rateLimitVideo(userId)
        break
    }

    const current = (await redis.get<number>(key)) || 0
    const ttl = await redis.ttl(key)
    const reset = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + config.window * 1000

    return {
      success: current < config.max,
      limit: config.max,
      remaining: Math.max(0, config.max - current),
      reset,
    }
  } catch (error) {
    console.error("[v0] Error getting rate limit status:", error)
    return {
      success: true,
      limit: RateLimits[type].max,
      remaining: RateLimits[type].max,
      reset: Date.now() + RateLimits[type].window * 1000,
    }
  }
}
