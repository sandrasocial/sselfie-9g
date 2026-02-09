import "server-only"
import { Redis } from "@upstash/redis"

type CronLock = {
  acquired: boolean
  lockKey: string
  lockValue: string
  release: () => Promise<void>
}

function getUpstashEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_KV_REST_API_URL ||
    // Legacy / misnamed env vars seen in this repo
    process.env.UPSTASH_KV_KV_REST_API_URL
  const token =
    process.env.UPSTASH_KV_REST_API_TOKEN ||
    // Legacy / misnamed env vars seen in this repo
    process.env.UPSTASH_KV_KV_REST_API_TOKEN

  if (!url || !token) return null
  return { url, token }
}

let redis: Redis | null = null
function getRedis(): Redis | null {
  if (redis) return redis
  const env = getUpstashEnv()
  if (!env) return null
  redis = new Redis({ url: env.url, token: env.token })
  return redis
}

function makeLockValue() {
  return `lock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Best-effort distributed lock for Vercel cron routes.
 *
 * - Fails open if Redis isn't configured, so crons still run.
 * - Uses a TTL to avoid permanent deadlocks.
 */
export async function acquireCronLock(jobName: string, ttlSeconds: number): Promise<CronLock> {
  const client = getRedis()
  const lockKey = `cron:lock:${jobName}`
  const lockValue = makeLockValue()

  if (!client) {
    return {
      acquired: true,
      lockKey,
      lockValue,
      release: async () => {},
    }
  }

  try {
    // NX = only set if not exists
    const ok = await client.set(lockKey, lockValue, { nx: true, ex: ttlSeconds })
    const acquired = ok === "OK"

    return {
      acquired,
      lockKey,
      lockValue,
      release: async () => {
        // Release only if we still own the lock.
        try {
          const current = await client.get<string>(lockKey)
          if (current === lockValue) {
            await client.del(lockKey)
          }
        } catch {
          // Ignore release failures.
        }
      },
    }
  } catch (error) {
    // Fail open: better to run the cron than to silently skip due to Redis issues.
    console.warn("[v0] [cron-lock] Failed to acquire lock; failing open:", error)
    return {
      acquired: true,
      lockKey,
      lockValue,
      release: async () => {},
    }
  }
}

