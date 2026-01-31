import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

const CRON_JOBS: Array<{ jobName: string; path: string }> = [
  { jobName: "sync-audience-segments", path: "/api/cron/sync-audience-segments" },
  { jobName: "refresh-segments", path: "/api/cron/refresh-segments" },
  { jobName: "send-blueprint-followups", path: "/api/cron/send-blueprint-followups" },
  { jobName: "blueprint-email-sequence", path: "/api/cron/blueprint-email-sequence" },
  { jobName: "welcome-sequence", path: "/api/cron/welcome-sequence" },
  { jobName: "nurture-sequence", path: "/api/cron/nurture-sequence" },
  { jobName: "welcome-back-sequence", path: "/api/cron/welcome-back-sequence" },
  { jobName: "reactivation-campaigns", path: "/api/cron/reactivation-campaigns" },
  { jobName: "blueprint-discovery-funnel", path: "/api/cron/blueprint-discovery-funnel" },
  { jobName: "reengagement-campaigns", path: "/api/cron/reengagement-campaigns" },
  { jobName: "send-scheduled-campaigns", path: "/api/cron/send-scheduled-campaigns" },
  { jobName: "referral-rewards", path: "/api/cron/referral-rewards" },
  { jobName: "milestone-bonuses", path: "/api/cron/milestone-bonuses" },
  { jobName: "upsell-campaigns", path: "/api/cron/upsell-campaigns" },
  { jobName: "admin-alerts", path: "/api/cron/admin-alerts" },
  { jobName: "reindex-codebase", path: "/api/cron/reindex-codebase" },
  { jobName: "resolve-pending-payments", path: "/api/cron/resolve-pending-payments" },
  { jobName: "reconcile-credits", path: "/api/cron/reconcile-credits" },
  { jobName: "health-e2e", path: "/api/health/e2e" },
]

const ANOMALY_THRESHOLDS = {
  welcomeCreditsMax: Number(process.env.CRON_ANOM_WELCOME_CREDITS_MAX || 20),
  membershipReconcileMax: Number(process.env.CRON_ANOM_MEMBERSHIP_RECONCILE_MAX || 20),
  backfillPaymentsMax: Number(process.env.CRON_ANOM_BACKFILL_PAYMENTS_MAX || 50),
  errorsAny: process.env.CRON_ANOM_ERRORS_ANY !== "false",
}

const extractSummaryCounts = (summary: any) => ({
  welcomeCredits: Number(summary?.grantedWelcomeCredits || summary?.welcomeGranted || 0),
  membershipCredits: Number(summary?.reconciledMembershipCredits || summary?.monthlyGranted || 0),
  backfilledPayments: Number(summary?.backfilledPayments || summary?.stripeReconcile?.stored || 0),
})

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const simulateAnomaly =
      process.env.NODE_ENV !== "production" &&
      searchParams.get("simulate") === "anomaly"

    const runs = await sql`
      SELECT id, job_name, status, started_at, finished_at, duration_ms, summary, error_id
      FROM admin_cron_runs
      WHERE started_at > NOW() - INTERVAL '7 days'
      ORDER BY started_at DESC
    `

    const errorIds = Array.from(new Set(runs.map((run: any) => run.error_id).filter(Boolean)))
    let errorMap = new Map<number, { message: string; createdAt: string }>()

    if (errorIds.length > 0) {
      const errors = await sql`
        SELECT id, error_message, created_at
        FROM admin_email_errors
        WHERE id = ANY(${errorIds})
      `
      errorMap = new Map(errors.map((error: any) => [error.id, { message: error.error_message, createdAt: error.created_at }]))
    }

    const now = Date.now()
    const cutoff24h = now - 24 * 60 * 60 * 1000
    const jobMap = new Map<string, any>()

    const ensureJob = (jobName: string, path: string) => {
      if (!jobMap.has(jobName)) {
        jobMap.set(jobName, {
          jobName,
          path,
          lastRunAt: null,
          lastStatus: null,
          runsLast24h: 0,
          runsLast7d: 0,
          lastSummary: null,
          lastErrorMessage: null,
          lastDurationMs: null,
          failedRuns7d: 0,
          maxSummary: {
            welcomeCredits: 0,
            membershipCredits: 0,
            backfilledPayments: 0,
          },
          recentRuns: [],
          anomaly: {
            flagged: false,
            reasons: [] as Array<{ metric: string; value: number; threshold: number } | { metric: string; value: string }>,
            latestCounts: {
              welcomeCredits: 0,
              membershipCredits: 0,
              backfilledPayments: 0,
            },
            maxCounts: {
              welcomeCredits: 0,
              membershipCredits: 0,
              backfilledPayments: 0,
            },
          },
        })
      }
      return jobMap.get(jobName)
    }

    for (const job of CRON_JOBS) {
      ensureJob(job.jobName, job.path)
    }

    for (const run of runs) {
      const jobName = run.job_name
      const path = CRON_JOBS.find((job) => job.jobName === jobName)?.path || `/api/cron/${jobName}`
      const job = ensureJob(jobName, path)
      const startedAt = run.started_at ? new Date(run.started_at).getTime() : null

      job.runsLast7d += 1
      if (startedAt && startedAt >= cutoff24h) {
        job.runsLast24h += 1
      }
      if (run.status === "failed") {
        job.failedRuns7d += 1
      }

      const counts = extractSummaryCounts(run.summary)
      job.maxSummary.welcomeCredits = Math.max(job.maxSummary.welcomeCredits, counts.welcomeCredits)
      job.maxSummary.membershipCredits = Math.max(job.maxSummary.membershipCredits, counts.membershipCredits)
      job.maxSummary.backfilledPayments = Math.max(job.maxSummary.backfilledPayments, counts.backfilledPayments)

      if (!job.lastRunAt || (startedAt && startedAt > new Date(job.lastRunAt).getTime())) {
        job.lastRunAt = run.started_at || null
        job.lastStatus = run.status || null
        job.lastSummary = run.summary || null
        job.lastDurationMs = run.duration_ms || null
        job.lastErrorMessage = run.error_id ? errorMap.get(run.error_id)?.message || null : null
      }

      if (job.recentRuns.length < 10) {
        job.recentRuns.push({
          status: run.status || null,
          startedAt: run.started_at || null,
          finishedAt: run.finished_at || null,
          durationMs: run.duration_ms || null,
          summary: run.summary || null,
          errorMessage: run.error_id ? errorMap.get(run.error_id)?.message || null : null,
        })
      }
    }

    for (const job of jobMap.values()) {
      if (simulateAnomaly && job.jobName === "reconcile-credits") {
        job.lastSummary = {
          grantedWelcomeCredits: ANOMALY_THRESHOLDS.welcomeCreditsMax + 5,
          reconciledMembershipCredits: ANOMALY_THRESHOLDS.membershipReconcileMax + 3,
          backfilledPayments: ANOMALY_THRESHOLDS.backfillPaymentsMax + 10,
        }
      }

      const latestCounts = extractSummaryCounts(job.lastSummary)
      job.anomaly.latestCounts = latestCounts
      job.anomaly.maxCounts = { ...job.maxSummary }
      const reasons: Array<{ metric: string; value: number; threshold: number } | { metric: string; value: string }> = []

      if (latestCounts.welcomeCredits > ANOMALY_THRESHOLDS.welcomeCreditsMax) {
        reasons.push({
          metric: "welcomeCredits",
          value: latestCounts.welcomeCredits,
          threshold: ANOMALY_THRESHOLDS.welcomeCreditsMax,
        })
      }
      if (latestCounts.membershipCredits > ANOMALY_THRESHOLDS.membershipReconcileMax) {
        reasons.push({
          metric: "membershipCredits",
          value: latestCounts.membershipCredits,
          threshold: ANOMALY_THRESHOLDS.membershipReconcileMax,
        })
      }
      if (latestCounts.backfilledPayments > ANOMALY_THRESHOLDS.backfillPaymentsMax) {
        reasons.push({
          metric: "backfilledPayments",
          value: latestCounts.backfilledPayments,
          threshold: ANOMALY_THRESHOLDS.backfillPaymentsMax,
        })
      }
      if (ANOMALY_THRESHOLDS.errorsAny && job.failedRuns7d > 0) {
        reasons.push({ metric: "failedRunsLast7d", value: String(job.failedRuns7d) })
      }

      job.anomaly.reasons = reasons
      job.anomaly.flagged = reasons.length > 0
    }

    const jobs = Array.from(jobMap.values()).sort((a, b) => a.path.localeCompare(b.path))

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      jobs,
    })
  } catch (error) {
    console.error("[v0] Error fetching cron health:", error)
    return NextResponse.json({ generatedAt: new Date().toISOString(), jobs: [] })
  }
}
