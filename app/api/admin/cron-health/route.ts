import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

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

    // Get overall health from dashboard view
    const healthDashboard = await sql`
      SELECT * FROM cron_job_health_dashboard
    `

    // Get recent failures (last 24 hours)
    const recentFailures = await sql`
      SELECT * FROM cron_job_recent_failures
      LIMIT 20
    `

    // Get detailed summary for all jobs
    const allJobs = await sql`
      SELECT 
        job_name,
        total_executions,
        total_successes,
        total_failures,
        last_run_at,
        last_status,
        last_duration_ms,
        last_error,
        average_duration_ms,
        success_rate,
        is_enabled,
        created_at,
        updated_at
      FROM cron_job_summary
      ORDER BY last_run_at DESC NULLS LAST
    `

    // Get performance history (last 50 runs for each job)
    const performanceHistory = await sql`
      SELECT 
        job_name,
        status,
        started_at,
        duration_ms,
        metadata
      FROM cron_job_logs
      WHERE started_at > NOW() - INTERVAL '7 days'
      ORDER BY started_at DESC
      LIMIT 500
    `

    // Calculate statistics
    const totalJobs = healthDashboard.length
    const healthyJobs = healthDashboard.filter((j: any) => j.health_status === '✅').length
    const warningJobs = healthDashboard.filter((j: any) => j.health_status === '⚠️').length
    const criticalJobs = healthDashboard.filter((j: any) => j.health_status === '❌' || j.health_status === '🔴').length

    // Calculate average success rate
    const avgSuccessRate = allJobs.length > 0
      ? allJobs.reduce((sum: number, job: any) => sum + (parseFloat(job.success_rate) || 0), 0) / allJobs.length
      : 100

    // Get failure count (last 24 hours)
    const failureCount = recentFailures.length

    return NextResponse.json({
      summary: {
        totalJobs,
        healthyJobs,
        warningJobs,
        criticalJobs,
        avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
        failureCount,
      },
      healthDashboard,
      recentFailures,
      allJobs,
      performanceHistory,
    })
  } catch (error) {
    console.error("[v0] Error fetching cron health:", error)
    return NextResponse.json({
      summary: {
        totalJobs: 0,
        healthyJobs: 0,
        warningJobs: 0,
        criticalJobs: 0,
        avgSuccessRate: 100,
        failureCount: 0,
      },
      healthDashboard: [],
      recentFailures: [],
      allJobs: [],
      performanceHistory: [],
    })
  }
}
