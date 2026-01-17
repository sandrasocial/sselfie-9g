import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

const WINDOW_HOURS = 24
const RATIO_THRESHOLD = 0.5
const ALERT_COOLDOWN_HOURS = Number(process.env.CRON_ALERT_COOLDOWN_HOURS || 6)

type HealthStatus = "green" | "yellow" | "red"

interface HealthReason {
  level: "red" | "yellow"
  message: string
}

const getRatio = (numerator: number, denominator: number) => {
  if (denominator === 0) return null
  return numerator / denominator
}

const formatRatioReason = (
  label: string,
  numerator: number,
  denominator: number,
  threshold: number,
) => {
  const ratio = getRatio(numerator, denominator)
  if (ratio === null) return null
  const percent = Math.round(ratio * 100)
  const thresholdPercent = Math.round(threshold * 100)
  return `${label} conversion is ${percent}% (${numerator}/${denominator}), below ${thresholdPercent}% threshold`
}

const getRecipients = () => {
  const list = process.env.ADMIN_ALERT_EMAILS || ""
  const fromList = list
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
  if (fromList.length > 0) return fromList
  if (process.env.ADMIN_EMAIL) return [process.env.ADMIN_EMAIL]
  return []
}

const wasAlertSentRecently = async (alertId: string) => {
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
    console.warn("[v0] [BlueprintHealth] Alert history unavailable:", error)
    return false
  }
}

const recordAlertSent = async (alertId: string, alertData: Record<string, unknown>) => {
  try {
    await sql`
      INSERT INTO admin_alert_sent (alert_id, alert_type, sent_at, alert_data)
      VALUES (${alertId}, 'blueprint-health', NOW(), ${JSON.stringify(alertData)})
    `
  } catch (error) {
    console.warn("[v0] [BlueprintHealth] Failed to record alert sent:", error)
  }
}

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

    const paidAtColumn = await sql`
      SELECT COUNT(*)::int AS count
      FROM information_schema.columns
      WHERE table_name = 'blueprint_subscribers'
        AND column_name = 'paid_at'
    `
    const hasPaidAt = Number(paidAtColumn[0]?.count || 0) > 0

    const windowStartSql = sql`NOW() - INTERVAL '24 hours'`

    const [
      signups,
      blueprintSubscribers,
      freeCredits,
      previewFeeds,
      previewGenerations,
      paidPurchases,
      fullFeeds,
      paidGenerations,
      freeWelcomeEmails,
      paidDeliveryEmails,
    ] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS count
        FROM users
        WHERE created_at >= ${windowStartSql}
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM blueprint_subscribers
        WHERE created_at >= ${windowStartSql}
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM credit_transactions
        WHERE transaction_type = 'bonus'
          AND description = 'Free blueprint credits (welcome bonus)'
          AND created_at >= ${windowStartSql}
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM feed_layouts
        WHERE layout_type = 'preview'
          AND created_at >= ${windowStartSql}
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM feed_posts p
        INNER JOIN feed_layouts l ON l.id = p.feed_layout_id
        WHERE l.layout_type = 'preview'
          AND (p.prediction_id IS NOT NULL OR p.generation_status = 'generating')
          AND COALESCE(p.updated_at, p.created_at) >= ${windowStartSql}
      `,
      hasPaidAt
        ? sql`
            SELECT COUNT(*)::int AS count
            FROM blueprint_subscribers
            WHERE paid_blueprint_purchased = TRUE
              AND paid_at >= ${windowStartSql}
          `
        : sql`
            SELECT COUNT(*)::int AS count
            FROM blueprint_subscribers
            WHERE paid_blueprint_purchased = TRUE
              AND updated_at >= ${windowStartSql}
          `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM feed_layouts
        WHERE layout_type = 'grid_3x3'
          AND created_at >= ${windowStartSql}
          AND user_id IN (
            SELECT user_id FROM blueprint_subscribers WHERE paid_blueprint_purchased = TRUE
          )
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM feed_posts p
        INNER JOIN feed_layouts l ON l.id = p.feed_layout_id
        WHERE l.layout_type = 'grid_3x3'
          AND l.user_id IN (
            SELECT user_id FROM blueprint_subscribers WHERE paid_blueprint_purchased = TRUE
          )
          AND (p.prediction_id IS NOT NULL OR p.generation_status = 'generating')
          AND COALESCE(p.updated_at, p.created_at) >= ${windowStartSql}
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM email_logs
        WHERE email_type = 'blueprint-followup-day-0'
          AND sent_at >= ${windowStartSql}
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM email_logs
        WHERE email_type = 'paid-blueprint-delivery'
          AND sent_at >= ${windowStartSql}
      `,
    ])

    const metrics = {
      signups: Number(signups[0]?.count || 0),
      blueprintSubscribers: Number(blueprintSubscribers[0]?.count || 0),
      freeCreditsGranted: Number(freeCredits[0]?.count || 0),
      previewFeedsCreated: Number(previewFeeds[0]?.count || 0),
      previewGenerationsStarted: Number(previewGenerations[0]?.count || 0),
      paidPurchases: Number(paidPurchases[0]?.count || 0),
      fullFeedPlannersCreated: Number(fullFeeds[0]?.count || 0),
      paidSingleGenerationsStarted: Number(paidGenerations[0]?.count || 0),
      freeWelcomeEmailsSent: Number(freeWelcomeEmails[0]?.count || 0),
      paidDeliveryEmailsSent: Number(paidDeliveryEmails[0]?.count || 0),
    }

    const recent = {
      signups: await sql`
        SELECT id, created_at AS occurred_at
        FROM users
        WHERE created_at >= ${windowStartSql}
        ORDER BY created_at DESC
        LIMIT 10
      `,
      blueprintSubscribers: await sql`
        SELECT id, created_at AS occurred_at
        FROM blueprint_subscribers
        WHERE created_at >= ${windowStartSql}
        ORDER BY created_at DESC
        LIMIT 10
      `,
      freeCreditsGranted: await sql`
        SELECT id, created_at AS occurred_at
        FROM credit_transactions
        WHERE transaction_type = 'bonus'
          AND description = 'Free blueprint credits (welcome bonus)'
          AND created_at >= ${windowStartSql}
        ORDER BY created_at DESC
        LIMIT 10
      `,
      previewFeedsCreated: await sql`
        SELECT id, created_at AS occurred_at
        FROM feed_layouts
        WHERE layout_type = 'preview'
          AND created_at >= ${windowStartSql}
        ORDER BY created_at DESC
        LIMIT 10
      `,
      previewGenerationsStarted: await sql`
        SELECT p.id, COALESCE(p.updated_at, p.created_at) AS occurred_at
        FROM feed_posts p
        INNER JOIN feed_layouts l ON l.id = p.feed_layout_id
        WHERE l.layout_type = 'preview'
          AND (p.prediction_id IS NOT NULL OR p.generation_status = 'generating')
          AND COALESCE(p.updated_at, p.created_at) >= ${windowStartSql}
        ORDER BY occurred_at DESC
        LIMIT 10
      `,
      paidPurchases: hasPaidAt
        ? await sql`
            SELECT id, paid_at AS occurred_at
            FROM blueprint_subscribers
            WHERE paid_blueprint_purchased = TRUE
              AND paid_at >= ${windowStartSql}
            ORDER BY paid_at DESC
            LIMIT 10
          `
        : await sql`
            SELECT id, updated_at AS occurred_at
            FROM blueprint_subscribers
            WHERE paid_blueprint_purchased = TRUE
              AND updated_at >= ${windowStartSql}
            ORDER BY updated_at DESC
            LIMIT 10
          `,
      fullFeedPlannersCreated: await sql`
        SELECT id, created_at AS occurred_at
        FROM feed_layouts
        WHERE layout_type = 'grid_3x3'
          AND created_at >= ${windowStartSql}
          AND user_id IN (
            SELECT user_id FROM blueprint_subscribers WHERE paid_blueprint_purchased = TRUE
          )
        ORDER BY created_at DESC
        LIMIT 10
      `,
      paidSingleGenerationsStarted: await sql`
        SELECT p.id, COALESCE(p.updated_at, p.created_at) AS occurred_at
        FROM feed_posts p
        INNER JOIN feed_layouts l ON l.id = p.feed_layout_id
        WHERE l.layout_type = 'grid_3x3'
          AND l.user_id IN (
            SELECT user_id FROM blueprint_subscribers WHERE paid_blueprint_purchased = TRUE
          )
          AND (p.prediction_id IS NOT NULL OR p.generation_status = 'generating')
          AND COALESCE(p.updated_at, p.created_at) >= ${windowStartSql}
        ORDER BY occurred_at DESC
        LIMIT 10
      `,
      freeWelcomeEmailsSent: await sql`
        SELECT id, sent_at AS occurred_at
        FROM email_logs
        WHERE email_type = 'blueprint-followup-day-0'
          AND sent_at >= ${windowStartSql}
        ORDER BY sent_at DESC
        LIMIT 10
      `,
      paidDeliveryEmailsSent: await sql`
        SELECT id, sent_at AS occurred_at
        FROM email_logs
        WHERE email_type = 'paid-blueprint-delivery'
          AND sent_at >= ${windowStartSql}
        ORDER BY sent_at DESC
        LIMIT 10
      `,
    }

    const healthReasons: HealthReason[] = []

    const orderedSteps: Array<{ key: keyof typeof metrics; label: string }> = [
      { key: "signups", label: "Signups" },
      { key: "blueprintSubscribers", label: "Blueprint subscribers" },
      { key: "freeCreditsGranted", label: "Free credits granted" },
      { key: "previewFeedsCreated", label: "Preview feeds created" },
      { key: "previewGenerationsStarted", label: "Preview generations started" },
      { key: "paidPurchases", label: "Paid purchases" },
      { key: "fullFeedPlannersCreated", label: "Full feed planners created" },
      { key: "paidSingleGenerationsStarted", label: "Paid single generations started" },
    ]

    for (let i = 1; i < orderedSteps.length; i++) {
      const prev = orderedSteps[i - 1]
      const current = orderedSteps[i]
      const prevCount = metrics[prev.key]
      const currentCount = metrics[current.key]
      if (prevCount > 0 && currentCount === 0) {
        healthReasons.push({
          level: "red",
          message: `${current.label} = 0 while ${prev.label} = ${prevCount}`,
        })
      }
    }

    const ratioChecks: Array<{
      numerator: keyof typeof metrics
      denominator: keyof typeof metrics
      label: string
    }> = [
      {
        numerator: "blueprintSubscribers",
        denominator: "signups",
        label: "Blueprint subscribers",
      },
      {
        numerator: "freeCreditsGranted",
        denominator: "blueprintSubscribers",
        label: "Free credits granted",
      },
      {
        numerator: "previewGenerationsStarted",
        denominator: "previewFeedsCreated",
        label: "Preview generations",
      },
      {
        numerator: "fullFeedPlannersCreated",
        denominator: "paidPurchases",
        label: "Full feed planners",
      },
      {
        numerator: "paidSingleGenerationsStarted",
        denominator: "fullFeedPlannersCreated",
        label: "Paid single generations",
      },
      {
        numerator: "freeWelcomeEmailsSent",
        denominator: "blueprintSubscribers",
        label: "Free welcome emails",
      },
      {
        numerator: "paidDeliveryEmailsSent",
        denominator: "paidPurchases",
        label: "Paid delivery emails",
      },
    ]

    for (const check of ratioChecks) {
      const numerator = metrics[check.numerator]
      const denominator = metrics[check.denominator]
      const ratio = getRatio(numerator, denominator)
      if (ratio !== null && ratio < RATIO_THRESHOLD) {
        const message = formatRatioReason(check.label, numerator, denominator, RATIO_THRESHOLD)
        if (message) {
          healthReasons.push({
            level: "yellow",
            message,
          })
        }
      }
    }

    let status: HealthStatus = "green"
    if (healthReasons.some((reason) => reason.level === "red")) {
      status = "red"
    } else if (healthReasons.some((reason) => reason.level === "yellow")) {
      status = "yellow"
    }

    const now = new Date()
    const windowStart = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000)

    if (status === "red") {
      const alertId = "blueprint-health-red"
      const shouldSend = !(await wasAlertSentRecently(alertId))
      const recipients = getRecipients()
      if (shouldSend && recipients.length > 0) {
        const subject = "🚨 Blueprint Funnel Health: RED"
        const reasons = healthReasons.map((reason) => `- ${reason.message}`).join("\n")
        const text = [
          "Status: RED",
          "",
          "Reasons:",
          reasons || "- No reasons provided",
          "",
          `Window start: ${windowStart.toISOString()}`,
          `Window end: ${now.toISOString()}`,
        ].join("\n")

        const emailResult = await sendEmail({
          to: recipients,
          subject,
          text,
          html: text.replace(/\n/g, "<br/>"),
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "blueprint-health-red",
          tags: ["admin-alert", "blueprint-health"],
        })

        if (emailResult.success) {
          await recordAlertSent(alertId, {
            status,
            reasons: healthReasons.map((reason) => reason.message),
            windowStart: windowStart.toISOString(),
            windowEnd: now.toISOString(),
          })
          console.log("[v0] [BlueprintHealth] ✅ RED alert sent")
        } else {
          console.warn("[v0] [BlueprintHealth] ⚠️ Failed to send RED alert:", emailResult.error)
        }
      }
    }

    return NextResponse.json({
      windowStart: windowStart.toISOString(),
      windowEnd: now.toISOString(),
      metrics,
      health: {
        status,
        reasons: healthReasons.map((reason) => reason.message),
      },
      recent: Object.fromEntries(
        Object.entries(recent).map(([key, rows]) => [
          key,
          rows.map((row: any) => ({ id: row.id, occurredAt: row.occurred_at })),
        ]),
      ),
    })
  } catch (error) {
    console.error("[v0] [admin-blueprint-health] error", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to load blueprint health" }, { status: 500 })
  }
}
