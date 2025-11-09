import { Redis } from "@upstash/redis"

let redisInstance: Redis | null = null

function getRedis() {
  if (!redisInstance) {
    if (!process.env.UPSTASH_KV_REST_API_URL || !process.env.UPSTASH_KV_REST_API_TOKEN) {
      console.warn("[v0] Redis not configured - caching disabled")
      return null
    }
    redisInstance = new Redis({
      url: process.env.UPSTASH_KV_REST_API_URL,
      token: process.env.UPSTASH_KV_REST_API_TOKEN,
    })
  }
  return redisInstance
}

// Cache durations in seconds
export const CACHE_TTL = {
  USER_DATA: 300, // 5 minutes
  CREDITS: 60, // 1 minute
  TRAINING_STATUS: 30, // 30 seconds
  PREDICTION_STATUS: 10, // 10 seconds for active predictions
  PREDICTION_COMPLETE: 3600, // 1 hour for completed predictions
}

/**
 * Get cached data with automatic JSON parsing
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null

  try {
    const data = await redis.get(key)
    return data as T
  } catch (error) {
    console.error(`[v0] Cache get error for ${key}:`, error)
    return null
  }
}

/**
 * Set cached data with automatic JSON stringification
 */
export async function setCache(key: string, value: any, ttl: number): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false

  try {
    await redis.setex(key, ttl, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[v0] Cache set error for ${key}:`, error)
    return false
  }
}

/**
 * Delete cached data
 */
export async function deleteCache(key: string): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false

  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error(`[v0] Cache delete error for ${key}:`, error)
    return false
  }
}

/**
 * Get or fetch pattern - try cache first, then fetch
 */
export async function getOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await getCache<T>(key)
  if (cached !== null) {
    return cached
  }

  const fresh = await fetchFn()
  await setCache(key, fresh, ttl)
  return fresh
}
