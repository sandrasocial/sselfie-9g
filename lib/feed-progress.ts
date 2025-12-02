import { Redis } from "@upstash/redis"

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_KV_KV_REST_API_URL!,
      token: process.env.UPSTASH_KV_KV_REST_API_TOKEN!,
    })
  }
  return redis
}

export interface FeedProgress {
  status: "starting" | "researching" | "designing" | "generating_captions" | "generating_images" | "complete" | "error"
  message: string
  progress: number // 0-100
  feedId?: string
  error?: string
}

export async function setFeedProgress(userId: string, progress: FeedProgress) {
  try {
    const key = `feed_progress:${userId}`
    const redisClient = getRedis()
    await redisClient.set(key, JSON.stringify(progress), { ex: 600 }) // Expire after 10 minutes
    console.log("[v0] [PROGRESS] Set progress for user", userId, ":", progress.message)
  } catch (error) {
    console.error("[v0] [PROGRESS] Failed to set progress (Redis error):", error)
  }
}

export async function getFeedProgress(userId: string): Promise<FeedProgress | null> {
  try {
    const key = `feed_progress:${userId}`
    const redisClient = getRedis()
    const data = await redisClient.get(key)
    if (!data) return null
    return typeof data === "string" ? JSON.parse(data) : (data as FeedProgress)
  } catch (error) {
    console.error("[v0] [PROGRESS] Failed to get progress (Redis error):", error)
    return null
  }
}

export async function clearFeedProgress(userId: string) {
  try {
    const key = `feed_progress:${userId}`
    const redisClient = getRedis()
    await redisClient.del(key)
  } catch (error) {
    console.error("[v0] [PROGRESS] Failed to clear progress (Redis error):", error)
  }
}
