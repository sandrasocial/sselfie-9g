import { getRedisClient } from "@/lib/redis"

const DEFAULT_DAILY_LIMIT = Number.parseInt(process.env.ALEX_DAILY_TOKEN_LIMIT || "1000000", 10)

function getDailyKey(date = new Date()) {
  const isoDate = date.toISOString().slice(0, 10)
  return `alex:tokens:${isoDate}`
}

function getSecondsUntilUtcMidnight() {
  const now = new Date()
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  const diffMs = utcMidnight - now.getTime()
  return Math.max(1, Math.ceil(diffMs / 1000))
}

export async function checkAlexTokenBudget() {
  const limit = Number.isFinite(DEFAULT_DAILY_LIMIT) ? DEFAULT_DAILY_LIMIT : 0
  if (limit <= 0) {
    return { allowed: true, used: 0, remaining: null, limit: null, source: "disabled" }
  }

  try {
    const redis = getRedisClient()
    const usedRaw = await redis.get<number>(getDailyKey())
    const used = Number(usedRaw || 0)
    const remaining = Math.max(0, limit - used)
    return {
      allowed: remaining > 0,
      used,
      remaining,
      limit,
      source: "redis",
    }
  } catch (error) {
    console.error("[Alex] Token budget check failed:", error)
    return { allowed: true, used: 0, remaining: null, limit, source: "error" }
  }
}

export async function recordAlexTokenUsage(tokens: number) {
  if (!Number.isFinite(tokens) || tokens <= 0) return
  const limit = Number.isFinite(DEFAULT_DAILY_LIMIT) ? DEFAULT_DAILY_LIMIT : 0
  if (limit <= 0) return

  try {
    const redis = getRedisClient()
    const key = getDailyKey()
    await redis.incrby(key, Math.round(tokens))
    await redis.expire(key, getSecondsUntilUtcMidnight())
  } catch (error) {
    console.error("[Alex] Token budget increment failed:", error)
  }
}
