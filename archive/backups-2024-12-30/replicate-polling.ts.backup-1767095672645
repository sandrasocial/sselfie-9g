import { getReplicateClient } from "./replicate-client"
import { getCache, setCache, CACHE_TTL } from "./cache"

interface PollOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  timeout?: number
}

const DEFAULT_OPTIONS: Required<PollOptions> = {
  maxAttempts: 60, // Max 60 attempts
  initialDelay: 1000, // Start with 1 second
  maxDelay: 10000, // Cap at 10 seconds
  timeout: 300000, // 5 minute total timeout
}

/**
 * Poll Replicate prediction with exponential backoff and caching
 * This prevents rate limiting and reduces API calls
 */
export async function pollPrediction(predictionId: string, options: PollOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = Date.now()
  const replicate = getReplicateClient()

  // Check cache first
  const cacheKey = `prediction:${predictionId}`
  const cached = await getCache<any>(cacheKey)
  if (cached && (cached.status === "succeeded" || cached.status === "failed" || cached.status === "canceled")) {
    return cached
  }

  let attempt = 0
  let delay = opts.initialDelay

  while (attempt < opts.maxAttempts) {
    if (Date.now() - startTime > opts.timeout) {
      throw new Error(`Prediction polling timeout after ${opts.timeout}ms`)
    }

    try {
      const prediction = await replicate.predictions.get(predictionId)

      // Cache completed predictions for longer
      if (prediction.status === "succeeded" || prediction.status === "failed" || prediction.status === "canceled") {
        await setCache(cacheKey, prediction, CACHE_TTL.PREDICTION_COMPLETE)
        return prediction
      }

      // Cache in-progress predictions briefly
      if (prediction.status === "processing" || prediction.status === "starting") {
        await setCache(cacheKey, prediction, CACHE_TTL.PREDICTION_STATUS)
      }

      // Still processing, wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Exponential backoff with jitter
      delay = Math.min(delay * 1.5 + Math.random() * 1000, opts.maxDelay)
      attempt++
    } catch (error: any) {
      // Handle rate limiting
      if (error.response?.status === 429) {
        console.log(`[v0] Replicate rate limit hit, backing off...`)
        await new Promise((resolve) => setTimeout(resolve, delay * 2))
        delay = Math.min(delay * 2, opts.maxDelay)
        attempt++
        continue
      }

      throw error
    }
  }

  throw new Error(`Prediction polling exceeded max attempts (${opts.maxAttempts})`)
}
