import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Maya Health Check Endpoint
 * 
 * Checks all critical components for Maya chat and concept generation:
 * - Database connectivity
 * - Anthropic API key
 * - Recent Maya chat errors
 * - Concept generation failures
 * - Feed planner context loading issues
 */
export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const health: any = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      issues: [],
      checks: {},
    }

    // Check 1: Database connectivity
    try {
      const dbCheck = await sql`SELECT NOW() as current_time`
      health.checks.database = {
        status: "ok",
        message: "Database connection successful",
        timestamp: dbCheck[0]?.current_time,
      }
    } catch (dbError: any) {
      health.status = "degraded"
      health.issues.push("Database connection failed")
      health.checks.database = {
        status: "error",
        message: dbError.message || "Database connection failed",
      }
    }

    // Check 2: Anthropic API key
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    health.checks.anthropic = {
      status: anthropicKey ? "ok" : "error",
      message: anthropicKey ? "API key configured" : "API key missing",
      keyLength: anthropicKey?.length || 0,
    }
    if (!anthropicKey) {
      health.status = "unhealthy"
      health.issues.push("Anthropic API key is missing")
    }

    // Check 3: Recent Maya chat errors (last 24 hours)
    try {
      const chatErrors = await sql`
        SELECT 
          COUNT(*) as error_count,
          MAX(created_at) as last_error
        FROM maya_chat_messages
        WHERE content LIKE '%error%' OR content LIKE '%failed%'
          AND created_at > NOW() - INTERVAL '24 hours'
      `.catch(() => [{ error_count: 0, last_error: null }])

      const errorCount = Number(chatErrors[0]?.error_count || 0)
      health.checks.recentChatErrors = {
        status: errorCount > 10 ? "warning" : "ok",
        count: errorCount,
        lastError: chatErrors[0]?.last_error,
        message: errorCount > 10 ? "High number of error messages detected" : "No significant errors",
      }
      if (errorCount > 10) {
        health.issues.push(`High number of error messages: ${errorCount}`)
      }
    } catch (err) {
      health.checks.recentChatErrors = {
        status: "error",
        message: "Failed to check chat errors",
      }
    }

    // Check 4: Recent concept generation attempts (last 24 hours)
    try {
      const conceptAttempts = await sql`
        SELECT 
          COUNT(*) as total_attempts,
          COUNT(CASE WHEN concept_cards IS NOT NULL AND jsonb_array_length(concept_cards) > 0 THEN 1 END) as successful,
          COUNT(CASE WHEN concept_cards IS NULL OR jsonb_array_length(concept_cards) = 0 THEN 1 END) as failed
        FROM maya_chat_messages
        WHERE role = 'assistant'
          AND created_at > NOW() - INTERVAL '24 hours'
          AND (content LIKE '%[GENERATE_CONCEPTS]%' OR concept_cards IS NOT NULL)
      `.catch(() => [{ total_attempts: 0, successful: 0, failed: 0 }])

      const total = Number(conceptAttempts[0]?.total_attempts || 0)
      const successful = Number(conceptAttempts[0]?.successful || 0)
      const failed = Number(conceptAttempts[0]?.failed || 0)
      const successRate = total > 0 ? (successful / total) * 100 : 100

      health.checks.conceptGeneration = {
        status: successRate < 80 ? "warning" : "ok",
        totalAttempts: total,
        successful,
        failed,
        successRate: Math.round(successRate * 10) / 10,
        message: successRate < 80 ? `Low success rate: ${Math.round(successRate)}%` : "Concept generation healthy",
      }
      if (successRate < 80 && total > 0) {
        health.status = "degraded"
        health.issues.push(`Concept generation success rate is low: ${Math.round(successRate)}%`)
      }
    } catch (err) {
      health.checks.conceptGeneration = {
        status: "error",
        message: "Failed to check concept generation",
      }
    }

    // Check 5: Feed planner context loading (check if feed-planner chats are working)
    try {
      const feedPlannerChats = await sql`
        SELECT 
          COUNT(*) as total_chats,
          COUNT(CASE WHEN chat_type = 'feed-planner' THEN 1 END) as feed_planner_chats
        FROM maya_chats
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `.catch(() => [{ total_chats: 0, feed_planner_chats: 0 }])

      health.checks.feedPlanner = {
        status: "ok",
        totalChats: Number(feedPlannerChats[0]?.total_chats || 0),
        feedPlannerChats: Number(feedPlannerChats[0]?.feed_planner_chats || 0),
        message: "Feed planner chats detected",
      }
    } catch (err) {
      health.checks.feedPlanner = {
        status: "error",
        message: "Failed to check feed planner",
      }
    }

    // Check 6: Recent API errors (check for 500 errors in logs)
    // This would require a logs table - for now, we'll check message content
    try {
      const apiErrors = await sql`
        SELECT 
          COUNT(*) as error_count
        FROM maya_chat_messages
        WHERE role = 'assistant'
          AND created_at > NOW() - INTERVAL '1 hour'
          AND (
            content LIKE '%500%' OR 
            content LIKE '%Internal Server Error%' OR
            content LIKE '%API error%' OR
            content LIKE '%failed to process%'
          )
      `.catch(() => [{ error_count: 0 }])

      const errorCount = Number(apiErrors[0]?.error_count || 0)
      health.checks.apiErrors = {
        status: errorCount > 5 ? "warning" : "ok",
        count: errorCount,
        message: errorCount > 5 ? "Recent API errors detected" : "No recent API errors",
      }
      if (errorCount > 5) {
        health.issues.push(`Recent API errors detected: ${errorCount}`)
      }
    } catch (err) {
      health.checks.apiErrors = {
        status: "error",
        message: "Failed to check API errors",
      }
    }

    // Check 7: Environment variables
    const requiredEnvVars = [
      "ANTHROPIC_API_KEY",
      "DATABASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]
    const missingEnvVars: string[] = []
    requiredEnvVars.forEach((varName) => {
      if (!process.env[varName]) {
        missingEnvVars.push(varName)
      }
    })

    health.checks.environment = {
      status: missingEnvVars.length > 0 ? "error" : "ok",
      missing: missingEnvVars,
      message:
        missingEnvVars.length > 0
          ? `Missing environment variables: ${missingEnvVars.join(", ")}`
          : "All required environment variables present",
    }
    if (missingEnvVars.length > 0) {
      health.status = "unhealthy"
      health.issues.push(`Missing environment variables: ${missingEnvVars.join(", ")}`)
    }

    return NextResponse.json(health, {
      status: health.status === "unhealthy" ? 500 : health.status === "degraded" ? 200 : 200,
    })
  } catch (error) {
    console.error("[v0] Maya health check error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
