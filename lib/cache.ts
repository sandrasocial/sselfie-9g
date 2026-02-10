import { Redis } from "@upstash/redis"
import crypto from "crypto"

let redisInstance: Redis | null = null

function getUpstashConfig(): { url: string; token: string } | null {
  // Support multiple env var naming conventions (Vercel integrations differ).
  const url =
    process.env.UPSTASH_KV_REST_API_URL ||
    process.env.UPSTASH_KV_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_KV_REST_URL
  const token =
    process.env.UPSTASH_KV_REST_API_TOKEN ||
    process.env.UPSTASH_KV_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_KV_REST_TOKEN

  if (!url || !token) return null
  return { url, token }
}

function getRedis() {
  if (!redisInstance) {
    const cfg = getUpstashConfig()
    if (!cfg) {
      console.warn("[v0] Redis not configured - caching disabled")
      return null
    }
    redisInstance = new Redis({
      url: cfg.url,
      token: cfg.token,
    })
  }
  return redisInstance
}

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`

let releaseLockScript: ReturnType<Redis["createScript"]> | null = null

function getReleaseLockScript(redis: Redis) {
  if (!releaseLockScript) {
    // `createScript` caches server-side via sha and retries with EVAL if needed.
    releaseLockScript = redis.createScript<number>(RELEASE_LOCK_LUA)
  }
  return releaseLockScript
}

export async function acquireKvLock(input: {
  key: string
  ttlMs: number
  value?: string
}): Promise<{ acquired: boolean; value: string; locked: boolean }> {
  const redis = getRedis()
  const value = input.value || `lock_${crypto.randomUUID()}`

  // If Redis isn't configured, allow the caller to proceed (best-effort).
  if (!redis) return { acquired: true, value, locked: false }

  const res = await redis.set(input.key, value, { nx: true, px: input.ttlMs })
  return { acquired: res === "OK", value, locked: true }
}

export async function releaseKvLock(input: { key: string; value: string }): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    const script = getReleaseLockScript(redis)
    await script.exec([input.key], [input.value])
  } catch (error) {
    console.warn("[v0] Failed to release KV lock:", { key: input.key, error })
  }
}

// Cache durations in seconds
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 900, // 15 minutes
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
    if (typeof data === "string") {
      try {
        return JSON.parse(data) as T
      } catch {
        // Some keys may be raw strings; allow callers to type accordingly.
        return data as T
      }
    }
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
