import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { logAdminError } from "@/lib/admin-error-log"
import { generateNurtureFreebieN1Email } from "@/lib/email/templates/nurture-freebie-n1"
import { generateNurtureFreebieN2Email } from "@/lib/email/templates/nurture-freebie-n2"
import { generateNurtureFreebieN3Email } from "@/lib/email/templates/nurture-freebie-n3"
import { generateNurtureFreebieN4Email } from "@/lib/email/templates/nurture-freebie-n4"
import { generateNurtureFreebieN5Email } from "@/lib/email/templates/nurture-freebie-n5"

const sql = neon(process.env.DATABASE_URL!)

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const STRATEGY_FALLBACK_URL = `${SITE_URL}/freebie/brand-strategy`
const STUDIO_PRODUCT_TYPES = ["sselfie_studio_membership", "brand_studio_membership"] as const
const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"

type CandidateLead = {
  id: number
  email: string
  name: string | null
  access_token: string | null
  created_at: string
}

type TouchConfig = {
  key: "n1" | "n2" | "n3" | "n4" | "n5"
  days: number
  emailType: string
}

const TOUCHES: TouchConfig[] = [
  { key: "n1", days: 2, emailType: "nurture-freebie-n1" },
  { key: "n2", days: 5, emailType: "nurture-freebie-n2" },
  { key: "n3", days: 9, emailType: "nurture-freebie-n3" },
  { key: "n4", days: 14, emailType: "nurture-freebie-n4" },
  { key: "n5", days: 20, emailType: "nurture-freebie-n5" },
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "unknown"
}

function firstNameFromLead(lead: CandidateLead): string | undefined {
  const fromName = typeof lead.name === "string" ? lead.name.trim() : ""
  if (fromName.length > 0) {
    return fromName.split(/\s+/)[0]
  }

  const emailPrefix = lead.email.split("@")[0]?.trim()
  return emailPrefix || undefined
}

function strategyUrlForLead(lead: CandidateLead): string {
  const token = typeof lead.access_token === "string" ? lead.access_token.trim() : ""
  if (!token) return STRATEGY_FALLBACK_URL
  return `${SITE_URL}/strategy/${token}`
}

async function getCandidatesForTouch(touch: TouchConfig): Promise<CandidateLead[]> {
  return (await sql`
    SELECT DISTINCT ON (LOWER(fbs.email))
      fbs.id,
      fbs.email,
      fbs.name,
      fbs.access_token,
      fbs.created_at
    FROM freebie_brand_strategies fbs
    WHERE fbs.email IS NOT NULL
      AND fbs.email <> ''
      AND fbs.created_at <= NOW() - (${`${touch.days} days`}::interval)
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(fbs.email)
          AND el.email_type = ${touch.emailType}
          AND el.status IN ('sent', 'delivered')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM subscriptions s
        INNER JOIN users u ON u.id::varchar = s.user_id
        WHERE LOWER(u.email) = LOWER(fbs.email)
          AND s.status = 'active'
          AND s.product_type = ANY(${STUDIO_PRODUCT_TYPES}::text[])
      )
    ORDER BY LOWER(fbs.email), fbs.created_at ASC
    LIMIT 200
  `) as CandidateLead[]
}

async function sendTouchEmail(touch: TouchConfig, lead: CandidateLead) {
  const firstName = firstNameFromLead(lead)
  const recipientEmail = lead.email

  switch (touch.key) {
    case "n1": {
      const email = generateNurtureFreebieN1Email({
        firstName,
        recipientEmail,
        strategyUrl: strategyUrlForLead(lead),
      })
      return sendEmail({
        to: recipientEmail,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: touch.emailType,
        tags: ["nurture-freebie", touch.key],
      })
    }
    case "n2": {
      const email = generateNurtureFreebieN2Email({ firstName, recipientEmail })
      return sendEmail({
        to: recipientEmail,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: touch.emailType,
        tags: ["nurture-freebie", touch.key],
      })
    }
    case "n3": {
      const email = generateNurtureFreebieN3Email({ firstName, recipientEmail })
      return sendEmail({
        to: recipientEmail,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: touch.emailType,
        tags: ["nurture-freebie", touch.key],
      })
    }
    case "n4": {
      const email = generateNurtureFreebieN4Email({ firstName, recipientEmail })
      return sendEmail({
        to: recipientEmail,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: touch.emailType,
        tags: ["nurture-freebie", touch.key],
      })
    }
    case "n5": {
      const email = generateNurtureFreebieN5Email({ firstName, recipientEmail })
      return sendEmail({
        to: recipientEmail,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: touch.emailType,
        tags: ["nurture-freebie", touch.key],
      })
    }
  }
}

export async function GET(request: Request) {
  const cronLogger = createCronLogger("nurture-sequence")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const results = {
      n1: { found: 0, sent: 0, failed: 0 },
      n2: { found: 0, sent: 0, failed: 0 },
      n3: { found: 0, sent: 0, failed: 0 },
      n4: { found: 0, sent: 0, failed: 0 },
      n5: { found: 0, sent: 0, failed: 0 },
      errors: [] as Array<{ email: string; touch: string; error: string }>,
    }

    for (const touch of TOUCHES) {
      const candidates = await getCandidatesForTouch(touch)
      results[touch.key].found = candidates.length

      for (const lead of candidates) {
        try {
          const result = await sendTouchEmail(touch, lead)
          if (result.success) {
            results[touch.key].sent += 1
          } else {
            results[touch.key].failed += 1
            results.errors.push({
              email: lead.email,
              touch: touch.key,
              error: result.error || "unknown",
            })
          }
        } catch (error: unknown) {
          results[touch.key].failed += 1
          results.errors.push({
            email: lead.email,
            touch: touch.key,
            error: errorMessage(error),
          })
        }

        await sleep(150)
      }
    }

    const totalSent = results.n1.sent + results.n2.sent + results.n3.sent + results.n4.sent + results.n5.sent
    const totalFailed =
      results.n1.failed + results.n2.failed + results.n3.failed + results.n4.failed + results.n5.failed

    await cronLogger.success({
      n1: results.n1,
      n2: results.n2,
      n3: results.n3,
      n4: results.n4,
      n5: results.n5,
      totalSent,
      totalFailed,
    })

    return NextResponse.json({
      success: true,
      results,
      totalSent,
      totalFailed,
      errors: results.errors.slice(0, 20),
    })
  } catch (error: unknown) {
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:nurture-sequence",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})

    return NextResponse.json(
      {
        success: false,
        error: "Failed to run nurture sequence",
        details: errorMessage(error),
      },
      { status: 500 },
    )
  }
}
