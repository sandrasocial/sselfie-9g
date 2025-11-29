/**
 * Safe retry helper for rate-limited AI API calls
 * Only use this for external AI service calls (OpenAI, Anthropic, Replicate)
 * DO NOT use for database, Stripe, or internal API calls
 */
export async function withSafeRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      const status = err?.response?.status || err?.status

      // Only retry on rate limits (429) or server errors (500+)
      if (status !== 429 && status < 500) throw err

      // If we've exhausted retries, throw the error
      if (i === retries) throw err

      // Exponential backoff: 1s, 2s, 4s
      await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, i)))
    }
  }

  // TypeScript safety - should never reach here
  throw new Error("Retry loop completed without returning")
}
