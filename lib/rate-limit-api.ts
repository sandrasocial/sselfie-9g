import { Redis } from "@upstash/redis"
import type { NextRequest } from "next/server"

const redis = new Redis({
  url: process.env.UPSTASH_KV_REST_API_URL!,
  token: process.env.UPSTASH_KV_REST_API_TOKEN!,
})

export interface RateLimitConfig {
  interval: number // Time window in seconds
  limit: number // Max requests in window
}

export interface RateLimitOptions {
  maxRequests: number // Max requests allowed
  windowMs: number // Time window in milliseconds
}

// Rate limit configurations by endpoint type
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  IMAGE_GENERATION: { interval: 60, limit: 10 }, // 10 images per minute
  VIDEO_GENERATION: { interval: 300, limit: 3 }, // 3 videos per 5 minutes
  TRAINING: { interval: 3600, limit: 2 }, // 2 trainings per hour
  CHAT: { interval: 60, limit: 30 }, // 30 messages per minute
  FEED_GENERATION: { interval: 300, limit: 5 }, // 5 feed generations per 5 minutes
}

export async function checkRateLimit(
  identifier: string,
  type: keyof typeof RATE_LIMITS,
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const config = RATE_LIMITS[type]
  const key = `ratelimit:${type}:${identifier}`

  try {
    const now = Date.now()
    const windowStart = now - config.interval * 1000

    // Use Redis sorted set for sliding window rate limiting
    const pipeline = redis.pipeline()

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart)

    // Count current requests in window
    pipeline.zcard(key)

    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}` })

    // Set expiry on the key
    pipeline.expire(key, config.interval)

    const results = await pipeline.exec()
    const count = (results[1] as number) || 0

    const remaining = Math.max(0, config.limit - count - 1)
    const reset = Math.ceil((now + config.interval * 1000) / 1000)

    if (count >= config.limit) {
      return {
        success: false,
        limit: config.limit,
        remaining: 0,
        reset,
      }
    }

    return {
      success: true,
      limit: config.limit,
      remaining,
      reset,
    }
  } catch (error) {
    console.error(`[v0] Rate limit check failed for ${identifier}:`, error)
    // Fail open - allow request if rate limiting is broken
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Math.ceil((Date.now() + config.interval * 1000) / 1000),
    }
  }
}

export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<{ success: boolean; retryAfter?: number }> {
  try {
    // Get user identifier from auth or IP
    const identifier = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous"

    const key = `ratelimit:custom:${identifier}`
    const now = Date.now()
    const windowStart = now - options.windowMs

    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart)
    pipeline.zcard(key)
    pipeline.zadd(key, { score: now, member: `${now}` })
    pipeline.expire(key, Math.ceil(options.windowMs / 1000))

    const results = await pipeline.exec()
    const count = (results[1] as number) || 0

    if (count >= options.maxRequests) {
      const retryAfter = Math.ceil(options.windowMs / 1000)
      return { success: false, retryAfter }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Rate limit error:", error)
    // Fail open if rate limiting breaks
    return { success: true }
  }
}
