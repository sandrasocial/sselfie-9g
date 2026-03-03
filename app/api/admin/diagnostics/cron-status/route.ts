import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"


type CronRegistryItem = {
  jobName: string
  schedule: string
  path: string
}

function toJobName(pathname: string): string {
  const value = String(pathname || "").trim()
  if (!value) return ""
  const parts = value.split("/").filter(Boolean)
  return parts[parts.length - 1] || ""
}

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "ssa@ssasocial.com").trim().toLowerCase()
}

async function loadCronRegistry(): Promise<CronRegistryItem[]> {
  try {
    const raw = await readFile(resolve(process.cwd(), "vercel.json"), "utf8")
    const parsed = JSON.parse(raw) as {
      crons?: Array<{ path?: string; schedule?: string }>
    }

    const crons = Array.isArray(parsed?.crons) ? parsed.crons : []
    return crons
      .map((entry) => {
        const path = String(entry.path || "").trim()
        const schedule = String(entry.schedule || "").trim()
        const jobName = toJobName(path)
        return { jobName, schedule, path }
      })
      .filter((row) => row.jobName && row.path)
  } catch {
    return []
  }
}

/**
 * GET /api/admin/diagnostics/cron-status
 * Returns latest cron status by job with run counts and latest error info.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || String(user.email || "").trim().toLowerCase() !== getAdminEmail()) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sinceHoursRaw = Number.parseInt(searchParams.get("since") || "24", 10)
    const sinceHours = Number.isFinite(sinceHoursRaw) ? Math.max(1, Math.min(24 * 30, sinceHoursRaw)) : 24

    const registry = await loadCronRegistry()

    const latestRows = await sql`
      SELECT DISTINCT ON (job_name)
        job_name,
        status,
        started_at,
        finished_at,
        duration_ms,
        summary
      FROM admin_cron_runs
      WHERE started_at > NOW() - ${sinceHours} * INTERVAL '1 hour'
      ORDER BY job_name, started_at DESC
    `

    const countRows = await sql`
      SELECT job_name, COUNT(*)::int AS run_count
      FROM admin_cron_runs
      WHERE started_at > NOW() - ${sinceHours} * INTERVAL '1 hour'
      GROUP BY job_name
    `

    const errorRows = await sql`
      SELECT DISTINCT ON (r.job_name)
        r.job_name,
        e.error_message,
        e.created_at
      FROM admin_cron_runs r
      JOIN admin_email_errors e ON e.id = r.error_id
      WHERE r.started_at > NOW() - ${sinceHours} * INTERVAL '1 hour'
      ORDER BY r.job_name, r.started_at DESC
    `

    const latestByJob = new Map<string, any>()
    for (const row of latestRows as any[]) latestByJob.set(String(row.job_name), row)

    const countByJob = new Map<string, number>()
    for (const row of countRows as any[]) countByJob.set(String(row.job_name), Number(row.run_count || 0))

    const errorByJob = new Map<string, { message: string; createdAt: string | null }>()
    for (const row of errorRows as any[]) {
      errorByJob.set(String(row.job_name), {
        message: String(row.error_message || ""),
        createdAt: row.created_at ? String(row.created_at) : null,
      })
    }

    const registryJobNames = new Set(registry.map((r) => r.jobName))
    const extraJobs = Array.from(latestByJob.keys())
      .filter((jobName) => !registryJobNames.has(jobName))
      .map((jobName) => ({ jobName, schedule: "", path: "" }))

    const jobs = [...registry, ...extraJobs].map((item) => {
      const latest = latestByJob.get(item.jobName)
      const lastError = errorByJob.get(item.jobName)

      return {
        jobName: item.jobName,
        schedule: item.schedule,
        path: item.path,
        runCount24h: countByJob.get(item.jobName) || 0,
        lastRun: latest
          ? {
              status: String(latest.status || "unknown"),
              startedAt: latest.started_at ? String(latest.started_at) : null,
              finishedAt: latest.finished_at ? String(latest.finished_at) : null,
              durationMs: latest.duration_ms != null ? Number(latest.duration_ms) : null,
              summary: latest.summary || {},
            }
          : null,
        lastError: lastError
          ? {
              message: lastError.message,
              createdAt: lastError.createdAt,
            }
          : null,
      }
    })

    jobs.sort((a, b) => {
      const aTs = a.lastRun?.startedAt ? new Date(a.lastRun.startedAt).getTime() : 0
      const bTs = b.lastRun?.startedAt ? new Date(b.lastRun.startedAt).getTime() : 0
      return bTs - aTs
    })

    return NextResponse.json({
      success: true,
      sinceHours,
      jobs,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[ADMIN-CRON-STATUS] Error fetching cron status:", error)
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
