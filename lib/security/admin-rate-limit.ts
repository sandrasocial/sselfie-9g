import { checkRateLimit } from "@/lib/rate-limit-api"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/**
 * Rate limit helper for admin routes
 * Uses existing rate limit infrastructure
 */
export async function checkAdminRateLimit(
  request: NextRequest,
  identifier: string,
): Promise<NextResponse | null> {
  try {
    // Use CHAT rate limit config (30 requests per minute)
    const result = await checkRateLimit(identifier, "CHAT")

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.reset),
            "Retry-After": String(result.reset - Math.floor(Date.now() / 1000)),
          },
        },
      )
    }

    return null // Rate limit passed
  } catch (error) {
    // Fail open - allow request if rate limiting fails
    console.error("[AdminRateLimit] Error checking rate limit:", error)
    return null
  }
}

