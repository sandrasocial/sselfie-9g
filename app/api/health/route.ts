import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { getDb } from "@/lib/db"
import { getRedisClient } from "@/lib/redis"

/**
 * Health Check Endpoint
 * 
 * Provides read-only status checks for core services:
 * - Database (Neon PostgreSQL)
 * - Cache (Upstash Redis)
 * - Auth (Supabase configuration)
 * 
 * Each check runs independently with timeouts to prevent hanging.
 * Returns clear status for non-technical debugging.
 */

interface HealthCheckResult {
  status: "ok" | "degraded" | "down"
  responseTime: number
  message: string
}

/**
 * Check database connectivity with timeout
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Database check timeout")), 5000)
    })

    const dbCheckPromise = (async () => {
      const sql = getDb()
      await sql`SELECT 1`
      return {
        status: "ok" as const,
        responseTime: Date.now() - startTime,
        message: "Database connection successful",
      }
    })()

    return await Promise.race([dbCheckPromise, timeoutPromise])
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes("timeout")) {
      return {
        status: "down",
        responseTime,
        message: "Database connection timeout (5s)",
      }
    }

    return {
      status: "down",
      responseTime,
      message: `Database error: ${errorMessage}`,
    }
  }
}

/**
 * Check Redis cache connectivity with timeout
 */
async function checkCache(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // Check if Redis env vars are configured (support both naming patterns)
    const hasRedisUrl = !!(
      process.env.UPSTASH_KV_REST_API_URL ||
      process.env.UPSTASH_KV_KV_REST_API_URL
    )
    const hasRedisToken = !!(
      process.env.UPSTASH_KV_REST_API_TOKEN ||
      process.env.UPSTASH_KV_KV_REST_API_TOKEN
    )

    // If Redis is not configured, return degraded (not down)
    if (!hasRedisUrl || !hasRedisToken) {
      return {
        status: "degraded",
        responseTime: 0,
        message: "Redis not configured (caching disabled)",
      }
    }

    // Try to get Redis client (may throw if env vars are invalid)
    let redis
    try {
      redis = getRedisClient()
    } catch (clientError) {
      return {
        status: "degraded",
        responseTime: Date.now() - startTime,
        message: "Redis client initialization failed",
      }
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Cache check timeout")), 5000)
    })

    const cacheCheckPromise = (async () => {
      await redis.ping()
      return {
        status: "ok" as const,
        responseTime: Date.now() - startTime,
        message: "Redis cache is reachable",
      }
    })()

    return await Promise.race([cacheCheckPromise, timeoutPromise])
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes("timeout")) {
      return {
        status: "down",
        responseTime,
        message: "Redis cache timeout (5s)",
      }
    }

    return {
      status: "down",
      responseTime,
      message: `Cache error: ${errorMessage}`,
    }
  }
}

/**
 * Check Supabase auth configuration (env vars only, no connectivity test)
 */
function checkAuth(): HealthCheckResult {
  const startTime = Date.now()

  const hasUrl = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_VITE_PUBLIC_SUPABASE_URL
  )

  const hasKey = !!(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_VITE_PUBLIC_SUPABASE_ANON_KEY
  )

  if (hasUrl && hasKey) {
    return {
      status: "ok",
      responseTime: Date.now() - startTime,
      message: "Supabase auth configuration present",
    }
  }

  return {
    status: "degraded",
    responseTime: Date.now() - startTime,
    message: "Supabase auth configuration missing",
  }
}

/**
 * Determine overall health status
 */
function getOverallStatus(checks: {
  database: HealthCheckResult
  cache: HealthCheckResult
  auth: HealthCheckResult
}): "healthy" | "degraded" | "unhealthy" {
  const hasDown = Object.values(checks).some((check) => check.status === "down")
  const hasDegraded = Object.values(checks).some((check) => check.status === "degraded")

  if (hasDown) return "unhealthy"
  if (hasDegraded) return "degraded"
  return "healthy"
}

/**
 * GET /api/health
 * 
 * Returns health status of core services
 */
export async function GET() {
  const requestStartTime = Date.now()

  try {
    logger.info("Health check requested")

    // Run all checks in parallel for speed
    const [database, cache, auth] = await Promise.all([
      checkDatabase(),
      checkCache(),
      Promise.resolve(checkAuth()), // Auth check is synchronous
    ])

    const checks = {
      database,
      cache,
      auth,
    }

    const overall = getOverallStatus(checks)
    const totalTime = Date.now() - requestStartTime

    const response = {
      overall,
      timestamp: new Date().toISOString(),
      checks,
      responseTime: totalTime,
    }

    // Log the health check result
    if (overall === "unhealthy") {
      logger.error("Health check failed", new Error("One or more services are down"), {
        overall,
        checks,
      })
    } else if (overall === "degraded") {
      logger.warn("Health check degraded", {
        overall,
        checks,
      })
    } else {
      logger.info("Health check passed", {
        overall,
        checks,
      })
    }

    // Return appropriate HTTP status
    const statusCode = overall === "unhealthy" ? 503 : overall === "degraded" ? 200 : 200

    return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    const totalTime = Date.now() - requestStartTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error("Health check endpoint error", error instanceof Error ? error : new Error(errorMessage), {
      responseTime: totalTime,
    })

    return NextResponse.json(
      {
        overall: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check endpoint failed",
        message: errorMessage,
        responseTime: totalTime,
      },
      { status: 500 },
    )
  }
}

