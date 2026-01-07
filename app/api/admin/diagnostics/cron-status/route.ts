import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

// Cron job registry from vercel.json
const CRON_JOBS: Record<string, { schedule: string; path: string }> = {
  "sync-audience-segments": { schedule: "0 2 * * *", path: "/api/cron/sync-audience-segments" },
  "refresh-segments": { schedule: "0 3 * * *", path: "/api/cron/refresh-segments" },
  "send-blueprint-followups": { schedule: "0 10 * * *", path: "/api/cron/send-blueprint-followups" },
  "blueprint-email-sequence": { schedule: "0 10 * * *", path: "/api/cron/blueprint-email-sequence" },
  "welcome-sequence": { schedule: "0 10 * * *", path: "/api/cron/welcome-sequence" },
  "nurture-sequence": { schedule: "0 11 * * *", path: "/api/cron/nurture-sequence" },
  "welcome-back-sequence": { schedule: "0 11 * * *", path: "/api/cron/welcome-back-sequence" },
  "reengagement-campaigns": { schedule: "0 12 * * *", path: "/api/cron/reengagement-campaigns" },
  "send-scheduled-campaigns": { schedule: "*/15 * * * *", path: "/api/cron/send-scheduled-campaigns" },
  "health-e2e": { schedule: "0 6 * * *", path: "/api/health/e2e" },
}

/**
 * GET /api/admin/diagnostics/cron-status
 * Returns cron job execution status for the last N hours
 * Query params:
 * - since: hours to look back (default: 24)
 */
export async function GET(request: Request) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sinceHours = parseInt(searchParams.get("since") || "24", 10)

    // Get cron run stats for each job
    const jobs = await Promise.all(
      Object.entries(CRON_JOBS).map(async ([jobName, config]) => {
        // Get last run
        const lastRun = await sql`
          SELECT status, started_at, finished_at, duration_ms, summary, error_id
          FROM admin_cron_runs
          WHERE job_name = ${jobName}
          ORDER BY started_at DESC
          LIMIT 1
        `

        // Get run count in last 24h
        const runCount = await sql`
          SELECT COUNT(*) as count
          FROM admin_cron_runs
          WHERE job_name = ${jobName}
            AND started_at > NOW() - ${sinceHours} * INTERVAL '1 hour'
        `

        // Get last error if any
        let lastError = null
        if (lastRun[0]?.error_id) {
          const error = await sql`
            SELECT error_message, created_at
            FROM admin_email_errors
            WHERE id = ${lastRun[0].error_id}
          `
          if (error[0]) {
            lastError = {
              message: error[0].error_message,
              createdAt: error[0].created_at,
            }
          }
        }

        return {
          jobName,
          schedule: config.schedule,
          path: config.path,
          lastRun: lastRun[0]
            ? {
                status: lastRun[0].status,
                startedAt: lastRun[0].started_at,
                finishedAt: lastRun[0].finished_at,
                durationMs: lastRun[0].duration_ms,
                summary: lastRun[0].summary || {},
              }
            : null,
          runCount24h: Number(runCount[0]?.count || 0),
          lastError,
        }
      })
    )

    return NextResponse.json({
      success: true,
      sinceHours,
      jobs,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[ADMIN-CRON] Error fetching cron status:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch cron status",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}


