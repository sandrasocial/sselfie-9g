import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createCronLogger } from "@/lib/cron-logger"
import { sendEmail } from "@/lib/email/send-email"

const sql = neon(process.env.DATABASE_URL!)

const ALERT_COOLDOWN_HOURS = Number(process.env.CRON_ALERT_COOLDOWN_HOURS || 6)
const STALE_THRESHOLD_HOURS = 26
const ANOMALY_THRESHOLDS = {
  welcomeCreditsMax: Number(process.env.CRON_ANOM_WELCOME_CREDITS_MAX || 20),
  membershipReconcileMax: Number(process.env.CRON_ANOM_MEMBERSHIP_RECONCILE_MAX || 20),
  backfillPaymentsMax: Number(process.env.CRON_ANOM_BACKFILL_PAYMENTS_MAX || 50),
  errorsAny: process.env.CRON_ANOM_ERRORS_ANY !== "false",
}

function getRecipients(): string[] {
  const list = process.env.ADMIN_ALERT_EMAILS || ""
  const fromList = list
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
  if (fromList.length > 0) return fromList
  if (process.env.ADMIN_EMAIL) return [process.env.ADMIN_EMAIL]
  return []
}

function getCronHealthLink(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://sselfie.ai"
  return `${base}/admin/cron-health`
}

const extractSummaryCounts = (summary: any) => ({
  welcomeCredits: Number(summary?.grantedWelcomeCredits || summary?.welcomeGranted || 0),
  membershipCredits: Number(summary?.reconciledMembershipCredits || summary?.monthlyGranted || 0),
  backfilledPayments: Number(summary?.backfilledPayments || summary?.stripeReconcile?.stored || 0),
})

async function wasAlertSentRecently(alertId: string): Promise<boolean> {
  try {
    const [result] = await sql`
      SELECT sent_at
      FROM admin_alert_sent
      WHERE alert_id = ${alertId}
        AND sent_at > NOW() - ${ALERT_COOLDOWN_HOURS} * INTERVAL '1 hour'
      ORDER BY sent_at DESC
      LIMIT 1
    `
    return Boolean(result?.sent_at)
  } catch (error) {
    console.warn("[v0] [CronHealthCheck] Alert history unavailable:", error)
    return false
  }
}

async function recordAlertSent(alertId: string, alertType: string, alertData: Record<string, unknown>) {
  try {
    await sql`
      INSERT INTO admin_alert_sent (alert_id, alert_type, sent_at, alert_data)
      VALUES (${alertId}, ${alertType}, NOW(), ${JSON.stringify(alertData)})
    `
  } catch (error) {
    console.warn("[v0] [CronHealthCheck] Failed to record alert sent:", error)
  }
}

export async function GET(request: NextRequest) {
  const cronLogger = createCronLogger("cron-health-check")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      await cronLogger.error(new Error("CRON_SECRET not configured"))
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      await cronLogger.error(new Error("Unauthorized"))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const testMode = url.searchParams.get("test")
    const allowTest = process.env.NODE_ENV !== "production" || process.env.CRON_ALERT_TEST_MODE === "true"
    if (testMode && !allowTest) {
      return NextResponse.json({ error: "Test mode disabled" }, { status: 403 })
    }

    const recipients = getRecipients()
    const cronHealthLink = getCronHealthLink()

    const lastOkRun = testMode === "stale"
      ? null
      : await sql`
          SELECT started_at
          FROM admin_cron_runs
          WHERE job_name = 'reconcile-credits'
            AND status = 'ok'
          ORDER BY started_at DESC
          LIMIT 1
        `
    const lastOkTimestamp = lastOkRun?.[0]?.started_at || null
    const lastOkAgeHours = lastOkTimestamp
      ? (Date.now() - new Date(lastOkTimestamp).getTime()) / (1000 * 60 * 60)
      : null
    const isStale = lastOkAgeHours === null || lastOkAgeHours > STALE_THRESHOLD_HOURS

    const failedRuns = testMode === "error"
      ? [
          {
            job_name: "reconcile-credits",
            started_at: new Date().toISOString(),
            error_id: 0,
          },
        ]
      : await sql`
          SELECT job_name, started_at, error_id
          FROM admin_cron_runs
          WHERE status = 'failed'
            AND started_at > NOW() - INTERVAL '24 hours'
          ORDER BY started_at DESC
          LIMIT 20
        `

    const staleAlertId = "cron-stale-reconcile-credits"
    const errorAlertId = "cron-errors-24h"
    const sentAlerts: string[] = []

    if (isStale) {
      const shouldSend = !(await wasAlertSentRecently(staleAlertId))
      if (shouldSend && recipients.length > 0) {
        const subject = "CRON STALE: reconcile-credits"
        const text = [
          "Cron stale alert",
          `Job: reconcile-credits`,
          `Last ok run: ${lastOkTimestamp || "never"}`,
          `Cron Health: ${cronHealthLink}`,
        ].join("\n")
        await sendEmail({
          to: recipients,
          subject,
          text,
          html: `<p><strong>Cron stale alert</strong></p>
            <p>Job: reconcile-credits</p>
            <p>Last ok run: ${lastOkTimestamp || "never"}</p>
            <p><a href="${cronHealthLink}">Open Cron Health</a></p>`,
          emailType: "cron-alert",
          tags: ["cron-alert", "cron-stale"],
        })
        await recordAlertSent(staleAlertId, "cron-alert", {
          job: "reconcile-credits",
          lastOkRun: lastOkTimestamp,
        })
        sentAlerts.push("stale")
      }
    }

    if (failedRuns.length > 0) {
      const shouldSend = !(await wasAlertSentRecently(errorAlertId))
      if (shouldSend && recipients.length > 0) {
        const summaryLines = failedRuns
          .map((run: any) => `- ${run.job_name} @ ${run.started_at} (error_id: ${run.error_id ?? "n/a"})`)
          .join("\n")
        const subject = "CRON ERRORS: last 24h"
        const text = [
          "Cron error alert",
          summaryLines,
          `Cron Health: ${cronHealthLink}`,
        ].join("\n")
        await sendEmail({
          to: recipients,
          subject,
          text,
          html: `<p><strong>Cron error alert</strong></p>
            <pre>${summaryLines}</pre>
            <p><a href="${cronHealthLink}">Open Cron Health</a></p>`,
          emailType: "cron-alert",
          tags: ["cron-alert", "cron-errors"],
        })
        await recordAlertSent(errorAlertId, "cron-alert", {
          errors: failedRuns.map((run: any) => ({
            job: run.job_name,
            startedAt: run.started_at,
            errorId: run.error_id,
          })),
        })
        sentAlerts.push("errors")
      }
    }

    const anomalyRuns = await sql`
      SELECT job_name, status, started_at, summary, error_id
      FROM admin_cron_runs
      WHERE started_at > NOW() - INTERVAL '7 days'
      ORDER BY started_at DESC
    `
    const anomalyJobMap = new Map<
      string,
      { latestSummary: any; latestStatus: string | null; failedRuns: number }
    >()

    for (const run of anomalyRuns) {
      const entry = anomalyJobMap.get(run.job_name) || {
        latestSummary: null,
        latestStatus: null,
        failedRuns: 0,
      }
      if (run.status === "failed") {
        entry.failedRuns += 1
      }
      if (!entry.latestSummary) {
        entry.latestSummary = run.summary || null
        entry.latestStatus = run.status || null
      }
      anomalyJobMap.set(run.job_name, entry)
    }

    for (const [jobName, entry] of anomalyJobMap.entries()) {
      const counts = extractSummaryCounts(entry.latestSummary)
      const reasons: string[] = []
      if (counts.welcomeCredits > ANOMALY_THRESHOLDS.welcomeCreditsMax) {
        reasons.push(`welcomeCredits=${counts.welcomeCredits} (max ${ANOMALY_THRESHOLDS.welcomeCreditsMax})`)
      }
      if (counts.membershipCredits > ANOMALY_THRESHOLDS.membershipReconcileMax) {
        reasons.push(`membershipCredits=${counts.membershipCredits} (max ${ANOMALY_THRESHOLDS.membershipReconcileMax})`)
      }
      if (counts.backfilledPayments > ANOMALY_THRESHOLDS.backfillPaymentsMax) {
        reasons.push(`backfilledPayments=${counts.backfilledPayments} (max ${ANOMALY_THRESHOLDS.backfillPaymentsMax})`)
      }
      if (ANOMALY_THRESHOLDS.errorsAny && entry.failedRuns > 0) {
        reasons.push(`failedRunsLast7d=${entry.failedRuns}`)
      }

      if (reasons.length === 0) {
        continue
      }

      const alertId = `cron-anomaly-${jobName}`
      const shouldSend = !(await wasAlertSentRecently(alertId))
      if (shouldSend && recipients.length > 0) {
        const subject = `CRON ANOMALY: ${jobName}`
        const text = [
          "Cron anomaly detected",
          `Job: ${jobName}`,
          `Reasons: ${reasons.join("; ")}`,
          `Cron Health: ${cronHealthLink}`,
        ].join("\n")
        await sendEmail({
          to: recipients,
          subject,
          text,
          html: `<p><strong>Cron anomaly detected</strong></p>
            <p>Job: ${jobName}</p>
            <p>Reasons: ${reasons.join("; ")}</p>
            <p><a href="${cronHealthLink}">Open Cron Health</a></p>`,
          emailType: "cron-alert",
          tags: ["cron-alert", "cron-anomaly"],
        })
        await recordAlertSent(alertId, "cron-anomaly", {
          job: jobName,
          reasons,
        })
        sentAlerts.push(`anomaly:${jobName}`)
      }
    }

    await cronLogger.success({
      stale: isStale,
      failedRuns: failedRuns.length,
      alertsSent: sentAlerts.length,
    })

    return NextResponse.json({
      success: true,
      stale: isStale,
      failedRuns: failedRuns.length,
      alertsSent: sentAlerts,
      lastOkRun: lastOkTimestamp,
      cooldownHours: ALERT_COOLDOWN_HOURS,
    })
  } catch (error: any) {
    console.error("[v0] [CronHealthCheck] Error:", error)
    await cronLogger.error(error)
    return NextResponse.json({ success: false, error: error.message || "Failed" }, { status: 500 })
  }
}
