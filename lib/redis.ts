import { Redis } from "@upstash/redis"

// Initialize Upstash Redis client
export function getRedisClient() {
  const url = process.env.UPSTASH_KV_REST_API_URL
  const token = process.env.UPSTASH_KV_REST_API_TOKEN

  if (!url || !token) {
    console.error("[v0] Upstash Redis environment variables not set")
    throw new Error("UPSTASH_KV_REST_API_URL and UPSTASH_KV_REST_API_TOKEN must be set")
  }

  return new Redis({
    url,
    token,
  })
}

// Cache key builders - following database naming conventions (snake_case)
export const CacheKeys = {
  // Maya chat caching
  mayaChatMessages: (chatId: number) => `maya:chat:${chatId}:messages`,
  mayaUserContext: (userId: string) => `maya:user:${userId}:context`,
  mayaPersonalMemory: (userId: string) => `maya:user:${userId}:memory`,
  mayaPersonalBrand: (userId: string) => `maya:user:${userId}:brand`,

  // Rate limiting
  rateLimitTraining: (userId: string) => `rate:limit:${userId}:training`,
  rateLimitGeneration: (userId: string) => `rate:limit:${userId}:generation`,
  rateLimitVideo: (userId: string) => `rate:limit:${userId}:video`,
  rateLimitWebhook: (identifier: string) => `rate:limit:webhook:${identifier}`,
  rateLimitEmail: (email: string) => `rate:limit:email:${email}`,
}

// Cache TTL (Time To Live) in seconds
export const CacheTTL = {
  chatMessages: 300, // 5 minutes
  userContext: 600, // 10 minutes
  personalMemory: 600, // 10 minutes
  personalBrand: 600, // 10 minutes
}

// Rate limit configurations
export const RateLimits = {
  training: {
    max: 3, // 3 training jobs per hour
    window: 3600, // 1 hour in seconds
  },
  generation: {
    max: 50, // 50 image generations per hour
    window: 3600,
  },
  video: {
    max: 10, // 10 video generations per hour
    window: 3600,
  },
  webhook: {
    max: 100, // 100 webhook events per minute per customer
    window: 60,
  },
  email: {
    max: 5, // 5 emails per hour per recipient
    window: 3600,
  },
}
