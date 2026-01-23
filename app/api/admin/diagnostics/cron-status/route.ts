import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { readFile } from "fs/promises"
import { join } from "path"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

async function loadCronJobsFromVercel() {
  try {
    const vercelPath = join(process.cwd(), "vercel.json")
    const raw = await readFile(vercelPath, "utf-8")
    const parsed = JSON.parse(raw)
    const crons = Array.isArray(parsed?.crons) ? parsed.crons : []

    const registry: Record<string, { schedule: string; path: string }> = {}

    for (const cron of crons) {
      const path = typeof cron?.path === "string" ? cron.path : null
      const schedule = typeof cron?.schedule === "string" ? cron.schedule : null
      if (!path || !schedule) continue

      const jobName = path.split("/").pop() || path
      registry[jobName] = { schedule, path }
    }

    return registry
  } catch (error) {
    console.error("[ADMIN-CRON] Failed to read vercel.json:", error)
    return {}
  }
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

    const cronRegistry = await loadCronJobsFromVercel()

    // Get cron run stats for each job
    const jobs = await Promise.all(
      Object.entries(cronRegistry).map(async ([jobName, config]) => {
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


