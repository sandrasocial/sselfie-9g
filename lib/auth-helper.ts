import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"

interface CachedAuth {
  user: User | null
  error: Error | null
  timestamp: number
}

const authCache = new Map<string, CachedAuth>()
const CACHE_TTL = 30000 // 30 seconds

/**
 * Get authenticated user with caching to reduce rate limit errors
 * This caches the result for 30 seconds to avoid repeated database queries
 */
export async function getAuthenticatedUser(): Promise<{
  user: User | null
  error: Error | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const cacheKey = session?.access_token || "anonymous"

    const cached = authCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { user: cached.user, error: cached.error }
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      let errorMessage = "Authentication failed"

      try {
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (typeof error === "object" && error !== null) {
          if ("status" in error && "statusText" in error) {
            errorMessage = `HTTP ${error.status}: ${error.statusText}`
          } else if ("message" in error) {
            errorMessage = String(error.message)
          } else {
            errorMessage = String(error)
          }
        } else if (typeof error === "string") {
          errorMessage = error
        } else {
          errorMessage = String(error)
        }
      } catch (serializationError) {
        errorMessage = "Error occurred but could not be serialized"
      }

      console.error("[v0] Auth error:", errorMessage)
      const result = { user: null, error: new Error(errorMessage) }

      authCache.set(cacheKey, { ...result, timestamp: Date.now() - CACHE_TTL + 5000 })

      return result
    }

    if (!user) {
      const result = { user: null, error: new Error("Not authenticated") }
      authCache.set(cacheKey, { ...result, timestamp: Date.now() })
      return result
    }

    const result = { user, error: null }
    authCache.set(cacheKey, { ...result, timestamp: Date.now() })

    return result
  } catch (error) {
    let errorMessage = "Authentication failed"

    try {
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "object" && error !== null) {
        if ("status" in error && "statusText" in error) {
          errorMessage = `HTTP ${error.status}: ${error.statusText}`
        } else {
          errorMessage = String(error)
        }
      } else {
        errorMessage = String(error)
      }
    } catch {
      errorMessage = "Error occurred but could not be serialized"
    }

    console.error("[v0] Auth helper error:", errorMessage)
    return {
      user: null,
      error: new Error(errorMessage),
    }
  }
}

/**
 * Get authenticated user with retry logic for rate limit errors
 * Use this only when absolutely necessary - prefer getAuthenticatedUser()
 */
export async function getAuthenticatedUserWithRetry(maxRetries = 3): Promise<{
  user: User | null
  error: Error | null
}> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await getAuthenticatedUser()

    if (result.user || !result.error?.message.includes("Too Many")) {
      return result
    }

    if (attempt < maxRetries) {
      const delay = attempt * 1000 // 1s, 2s, 3s
      console.log(`[v0] Rate limit detected, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return {
    user: null,
    error: new Error("Rate limit exceeded. Please try again in a moment."),
  }
}

/**
 * Helper to get authenticated user from Next.js request
 * Returns the user object or null if not authenticated
 */
export async function getUser(request: Request): Promise<User | null> {
  const { user } = await getAuthenticatedUser()
  return user
}
