import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { logAdminError } from "@/lib/admin-error-log"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import {
  FREEBIE_STRATEGY_EMAIL_TOUCHES,
  SELFIE_GUIDE_EMAIL_TOUCHES,
} from "@/lib/email/selfie-guide-email-sequence"
import { generateNurtureStrategyN1Email } from "@/lib/email/templates/nurture-strategy-n1"
import { generateNurtureStrategyN2Email } from "@/lib/email/templates/nurture-strategy-n2"
import { generateNurtureStrategyN3Email } from "@/lib/email/templates/nurture-strategy-n3"
import { generateNurtureStrategyN4Email } from "@/lib/email/templates/nurture-strategy-n4"
import { generateNurtureStrategyN5Email } from "@/lib/email/templates/nurture-strategy-n5"
import { generateSelfieGuideActivationDay0Email } from "@/lib/email/templates/selfie-guide-activation-day0"
import { generateSelfieGuideDay3CheckinEmail } from "@/lib/email/templates/selfie-guide-day3-checkin"
import { generateSelfieGuideDay7ChallengeEmail } from "@/lib/email/templates/selfie-guide-day7-challenge"
import { generateSelfieGuideDay14MayaBridgeEmail } from "@/lib/email/templates/selfie-guide-day14-maya-bridge"
import { generateSelfieGuideDay21FinalEmail } from "@/lib/email/templates/selfie-guide-day21-final"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const STRATEGY_FALLBACK_URL = `${SITE_URL}/brand-strategy`
const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"

type StrategyTouchKey = "n1" | "n2" | "n3" | "n4" | "n5"

interface StrategyLeadCandidate {
  id: number
  email: string
  name: string | null
  access_token: string | null
  created_at: string
}

interface SelfieGuideActivationCandidate {
  email: string
  name: string | null
  access_token: string | null
  subscription_created_at: string
}

interface SelfieGuideTouchCandidate {
  email: string
  name: string | null
  access_token: string | null
  subscription_created_at: string
}

const STRATEGY_TOUCH_KEYS: StrategyTouchKey[] = ["n1", "n2", "n3", "n4", "n5"]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "unknown"
}

function strategyUrlForLead(lead: StrategyLeadCandidate): string {
  const token = typeof lead.access_token === "string" ? lead.access_token.trim() : ""
  return token.length > 0 ? `${SITE_URL}/strategy/${token}` : STRATEGY_FALLBACK_URL
}

function selfieGuideAccessUrl(candidate: SelfieGuideActivationCandidate): string {
  const token = typeof candidate.access_token === "string" ? candidate.access_token.trim() : ""
  return token.length > 0 ? `${SITE_URL}/selfie-guide/access/${token}` : `${SITE_URL}/selfie-guide`
}

async function getStrategyCandidatesForTouch(days: number, emailType: string): Promise<StrategyLeadCandidate[]> {
  // Target Brand Strategy Pack ($19) buyers who completed the questionnaire (have a strategy row with setup_token).
  // Uses freebie_brand_strategies.created_at for day offset (strategy completion date).
  return (await sql`
    SELECT
      fbs.id,
      u.email,
      NULLIF(BTRIM(u.display_name), '') AS name,
      fbs.access_token,
      fbs.created_at
    FROM subscriptions s
    INNER JOIN users u ON u.id::text = s.user_id
    INNER JOIN freebie_brand_strategies fbs
      ON LOWER(fbs.email) = LOWER(u.email)
      AND fbs.setup_token IS NOT NULL
    WHERE s.product_type = 'brand_strategy_pack'
      AND s.status = 'active'
      AND u.email IS NOT NULL
      AND u.email <> ''
      AND fbs.created_at <= NOW() - (${`${days} days`}::interval)
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(u.email)
          AND el.email_type = ${emailType}
          AND el.status IN ('sent', 'delivered')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM subscriptions s2
        WHERE s2.user_id = s.user_id
          AND s2.status = 'active'
          AND s2.product_type IN ('sselfie_studio_membership', 'brand_studio_membership')
      )
    ORDER BY fbs.created_at ASC
    LIMIT 200
  `) as StrategyLeadCandidate[]
}

async function getSelfieGuideActivationCandidates(): Promise<SelfieGuideActivationCandidate[]> {
  return (await sql`
    SELECT DISTINCT ON (LOWER(u.email))
      u.email,
      COALESCE(NULLIF(BTRIM(fs.name), ''), NULLIF(BTRIM(u.display_name), '')) AS name,
      fs.access_token,
      s.created_at AS subscription_created_at
    FROM subscriptions s
    INNER JOIN users u ON u.id::varchar = s.user_id
    INNER JOIN freebie_subscribers fs ON LOWER(fs.email) = LOWER(u.email)
    WHERE s.product_type IN ('selfie_guide', 'selfie_guide_bundle')
      AND s.status = 'active'
      AND s.created_at <= NOW()
      AND s.created_at > NOW() - INTERVAL '3 days'
      AND u.email IS NOT NULL
      AND u.email <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(u.email)
          AND el.email_type = 'selfie-guide-activation-day0'
          AND el.status IN ('sent', 'delivered')
      )
    ORDER BY LOWER(u.email), s.created_at DESC
    LIMIT 200
  `) as SelfieGuideActivationCandidate[]
}

async function sendStrategyTouchEmail(touchKey: StrategyTouchKey, lead: StrategyLeadCandidate, emailType: string) {
  const firstName = getFirstNameForEmail({ fullName: lead.name, email: lead.email })
  const recipientEmail = lead.email

  switch (touchKey) {
    case "n1": {
      const email = generateNurtureStrategyN1Email({
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
        emailType,
        tags: ["nurture-strategy", touchKey],
      })
    }
    case "n2": {
      const email = generateNurtureStrategyN2Email({
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
        emailType,
        tags: ["nurture-strategy", touchKey],
      })
    }
    case "n3": {
      const email = generateNurtureStrategyN3Email({ firstName, recipientEmail })
      return sendEmail({
        to: recipientEmail,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType,
        tags: ["nurture-strategy", touchKey],
      })
    }
    case "n4": {
      const email = generateNurtureStrategyN4Email({ firstName, recipientEmail })
      return sendEmail({
        to: recipientEmail,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType,
        tags: ["nurture-strategy", touchKey],
      })
    }
    case "n5": {
      const email = generateNurtureStrategyN5Email({ firstName, recipientEmail })
      return sendEmail({
        to: recipientEmail,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType,
        tags: ["nurture-strategy", touchKey],
      })
    }
  }
}

async function getSelfieGuideTouchCandidates(days: number, emailType: string): Promise<SelfieGuideTouchCandidate[]> {
  return (await sql`
    SELECT DISTINCT ON (LOWER(u.email))
      u.email,
      COALESCE(NULLIF(BTRIM(fs.name), ''), NULLIF(BTRIM(u.display_name), '')) AS name,
      fs.access_token,
      s.created_at AS subscription_created_at
    FROM subscriptions s
    INNER JOIN users u ON u.id::varchar = s.user_id
    INNER JOIN freebie_subscribers fs ON LOWER(fs.email) = LOWER(u.email)
    WHERE s.product_type IN ('selfie_guide', 'selfie_guide_bundle')
      AND s.status = 'active'
      AND s.created_at <= NOW() - (${`${days} days`}::interval)
      AND u.email IS NOT NULL
      AND u.email <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(u.email)
          AND el.email_type = ${emailType}
          AND el.status IN ('sent', 'delivered')
      )
    ORDER BY LOWER(u.email), s.created_at DESC
    LIMIT 200
  `) as SelfieGuideTouchCandidate[]
}

function formatExpiryDate(subscriptionCreatedAt: string, daysAfterPurchase: number): string {
  const purchaseDate = new Date(subscriptionCreatedAt)
  const expiryDate = new Date(purchaseDate.getTime() + daysAfterPurchase * 24 * 60 * 60 * 1000)
  return expiryDate.toLocaleDateString("en-GB", { month: "long", day: "numeric" })
}

async function sendSelfieGuideTouchEmail(
  emailType: string,
  candidate: SelfieGuideTouchCandidate,
  accessUrl: string,
) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })

  let email: { html: string; text: string; subject: string }

  switch (emailType) {
    case "selfie-guide-day3-checkin":
      email = generateSelfieGuideDay3CheckinEmail({ firstName, recipientEmail: candidate.email, accessUrl })
      break
    case "selfie-guide-day7-challenge":
      email = generateSelfieGuideDay7ChallengeEmail({ firstName, recipientEmail: candidate.email, accessUrl })
      break
    case "selfie-guide-day14-maya-bridge":
      email = generateSelfieGuideDay14MayaBridgeEmail({ firstName, recipientEmail: candidate.email, accessUrl })
      break
    case "selfie-guide-day21-final": {
      const expiryDate = formatExpiryDate(candidate.subscription_created_at, 28)
      email = generateSelfieGuideDay21FinalEmail({ firstName, recipientEmail: candidate.email, accessUrl, expiryDate })
      break
    }
    default:
      throw new Error(`Unknown selfie guide email type: ${emailType}`)
  }

  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType,
    tags: ["selfie-guide", emailType],
  })
}

async function sendSelfieGuideActivationEmail(candidate: SelfieGuideActivationCandidate) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })
  const email = generateSelfieGuideActivationDay0Email({
    firstName,
    recipientEmail: candidate.email,
    accessUrl: selfieGuideAccessUrl(candidate),
  })

  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType: SELFIE_GUIDE_EMAIL_TOUCHES[0].emailType,
    tags: ["selfie-guide", "selfie-guide-activation"],
  })
}

export async function GET(request: Request) {
  const cronLogger = createCronLogger("nurture-sequence")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction) {
      if (!cronSecret) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "CRON_SECRET not set in production" })
        return NextResponse.json({ error: "Unauthorized: CRON_SECRET required in production" }, { status: 401 })
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const results = {
      selfieGuideDay0: { found: 0, sent: 0, failed: 0 },
      selfieGuideDay3: { found: 0, sent: 0, failed: 0 },
      selfieGuideDay7: { found: 0, sent: 0, failed: 0 },
      selfieGuideDay14: { found: 0, sent: 0, failed: 0 },
      selfieGuideDay21: { found: 0, sent: 0, failed: 0 },
      n1: { found: 0, sent: 0, failed: 0 },
      n2: { found: 0, sent: 0, failed: 0 },
      n3: { found: 0, sent: 0, failed: 0 },
      n4: { found: 0, sent: 0, failed: 0 },
      n5: { found: 0, sent: 0, failed: 0 },
      errors: [] as Array<{ email: string; touch: string; error: string }>,
    }

    // Day 0 activation
    const selfieGuideCandidates = await getSelfieGuideActivationCandidates()
    results.selfieGuideDay0.found = selfieGuideCandidates.length

    for (const candidate of selfieGuideCandidates) {
      try {
        const result = await sendSelfieGuideActivationEmail(candidate)
        if (result.success) {
          results.selfieGuideDay0.sent += 1
        } else {
          results.selfieGuideDay0.failed += 1
          results.errors.push({
            email: candidate.email,
            touch: "selfie-guide-day0",
            error: result.error || "unknown",
          })
        }
      } catch (error: unknown) {
        results.selfieGuideDay0.failed += 1
        results.errors.push({
          email: candidate.email,
          touch: "selfie-guide-day0",
          error: errorMessage(error),
        })
      }

      await sleep(150)
    }

    // Day 3, 7, 14, 21 timed touches — skip Day 0 (index 0) since it's handled above
    const selfieGuideTouchResultKeys = [
      "selfieGuideDay3",
      "selfieGuideDay7",
      "selfieGuideDay14",
      "selfieGuideDay21",
    ] as const
    const selfieGuideTouches = SELFIE_GUIDE_EMAIL_TOUCHES.slice(1) // skip Day 0

    for (const [index, touch] of selfieGuideTouches.entries()) {
      const resultKey = selfieGuideTouchResultKeys[index]
      const candidates = await getSelfieGuideTouchCandidates(touch.days, touch.emailType)
      results[resultKey].found = candidates.length

      for (const candidate of candidates) {
        const accessUrl = selfieGuideAccessUrl(candidate)
        try {
          const result = await sendSelfieGuideTouchEmail(touch.emailType, candidate, accessUrl)
          if (result.success) {
            results[resultKey].sent += 1
          } else {
            results[resultKey].failed += 1
            results.errors.push({
              email: candidate.email,
              touch: touch.emailType,
              error: result.error || "unknown",
            })
          }
        } catch (error: unknown) {
          results[resultKey].failed += 1
          results.errors.push({
            email: candidate.email,
            touch: touch.emailType,
            error: errorMessage(error),
          })
        }

        await sleep(150)
      }
    }

    for (const [index, touch] of FREEBIE_STRATEGY_EMAIL_TOUCHES.entries()) {
      const touchKey = STRATEGY_TOUCH_KEYS[index]
      const candidates = await getStrategyCandidatesForTouch(touch.days, touch.emailType)
      results[touchKey].found = candidates.length

      for (const lead of candidates) {
        try {
          const result = await sendStrategyTouchEmail(touchKey, lead, touch.emailType)
          if (result.success) {
            results[touchKey].sent += 1
          } else {
            results[touchKey].failed += 1
            results.errors.push({
              email: lead.email,
              touch: touchKey,
              error: result.error || "unknown",
            })
          }
        } catch (error: unknown) {
          results[touchKey].failed += 1
          results.errors.push({
            email: lead.email,
            touch: touchKey,
            error: errorMessage(error),
          })
        }

        await sleep(150)
      }
    }

    const totalSent =
      results.selfieGuideDay0.sent +
      results.selfieGuideDay3.sent +
      results.selfieGuideDay7.sent +
      results.selfieGuideDay14.sent +
      results.selfieGuideDay21.sent +
      results.n1.sent +
      results.n2.sent +
      results.n3.sent +
      results.n4.sent +
      results.n5.sent
    const totalFailed =
      results.selfieGuideDay0.failed +
      results.selfieGuideDay3.failed +
      results.selfieGuideDay7.failed +
      results.selfieGuideDay14.failed +
      results.selfieGuideDay21.failed +
      results.n1.failed +
      results.n2.failed +
      results.n3.failed +
      results.n4.failed +
      results.n5.failed

    await cronLogger.success({
      selfieGuideDay0: results.selfieGuideDay0,
      selfieGuideDay3: results.selfieGuideDay3,
      selfieGuideDay7: results.selfieGuideDay7,
      selfieGuideDay14: results.selfieGuideDay14,
      selfieGuideDay21: results.selfieGuideDay21,
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
