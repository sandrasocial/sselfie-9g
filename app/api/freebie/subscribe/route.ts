import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { addOrUpdateResendContact } from "@/lib/resend/manage-contact"
import { generateFreebieGuideEmail } from "@/lib/email/templates/freebie-guide-email"
import { sendEmail } from "@/lib/email/send-email"
import { normalizeFreebieEmail, normalizeFreebieEmailTags, resolveAccessToken } from "@/lib/freebie/subscribe-utils"
import { hasResendApiKey } from "@/lib/resend/api-key"

const DELIVERY_RESEND_COOLDOWN_MINUTES = 15

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.sselfie.ai")
    .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
    .replace(/\/+$/, "")
}

function selfieGuideAccessUrl(accessToken: string): string {
  return `${siteUrl()}/selfie-guide/access/${accessToken}`
}

function firstNameFrom(name: string | null | undefined, fallback: string): string {
  return (name || fallback).trim().split(/\s+/)[0] || fallback.trim()
}

async function recentlySentDeliveryEmail(email: string, sentAt: string | Date | null | undefined): Promise<boolean> {
  if (sentAt) {
    const sentTime = new Date(sentAt).getTime()
    if (Number.isFinite(sentTime) && Date.now() - sentTime < DELIVERY_RESEND_COOLDOWN_MINUTES * 60 * 1000) {
      return true
    }
  }

  const recentLogs = await sql`
    SELECT 1
    FROM email_logs
    WHERE LOWER(BTRIM(user_email)) = ${email}
      AND email_type = 'freebie_guide'
      AND status IN ('sent', 'delivered')
      AND COALESCE(sent_at, created_at) > NOW() - (${`${DELIVERY_RESEND_COOLDOWN_MINUTES} minutes`}::interval)
    LIMIT 1
  `
  return recentLogs.length > 0
}

async function sendGuideDeliveryEmail(input: {
  email: string
  firstName: string
  accessUrl: string
}): Promise<{ emailSent: boolean; emailError: string | null }> {
  if (!hasResendApiKey()) {
    console.log("[v0] RESEND_API_KEY not configured, skipping email")
    return { emailSent: false, emailError: "RESEND_API_KEY not configured" }
  }

  const emailContent = generateFreebieGuideEmail({
    firstName: input.firstName,
    email: input.email,
    guideAccessLink: input.accessUrl,
  })

  const emailResult = await sendEmail({
    from: "SSELFIE <hello@sselfie.ai>",
    to: input.email,
    replyTo: "hello@sselfie.ai",
    subject: "Your free guide is here",
    html: emailContent.html,
    text: emailContent.text,
    tags: ["freebie-guide"],
    emailType: "freebie_guide",
  })

  if (!emailResult.success) {
    return { emailSent: false, emailError: emailResult.error || "Failed to send email" }
  }

  return { emailSent: true, emailError: null }
}

export async function POST(request: NextRequest) {
  console.log("[v0] Freebie subscribe POST handler called")

  try {
    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { email, name, source, utm_source, utm_medium, utm_campaign, referrer, user_agent } = body

    if (!email || !name) {
      console.log("[v0] Missing email or name")
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 })
    }

    const normalizedEmail = normalizeFreebieEmail(String(email))
    const trimmedName = String(name).trim()
    const incomingSource = typeof source === "string" && source.trim().length > 0 ? source.trim() : "selfie-guide"

    if (!normalizedEmail || !trimmedName) {
      console.log("[v0] Missing normalized email or trimmed name")
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 })
    }

    console.log("[v0] Email and name received:", { email: normalizedEmail, name: trimmedName })

    console.log("[v0] Checking if email already exists")
    const existingSubscriber = await sql`
      SELECT id, access_token, guide_access_email_sent, guide_access_email_sent_at, name, resend_contact_id, email, source, email_tags
      FROM freebie_subscribers
      WHERE LOWER(BTRIM(email)) = ${normalizedEmail}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existingSubscriber.length > 0) {
      console.log("[v0] Existing subscriber found:", existingSubscriber[0].id)
      const subscriber = existingSubscriber[0]
      const { accessToken, wasGenerated } = resolveAccessToken(subscriber.access_token)
      const normalizedEmailTags = normalizeFreebieEmailTags(
        Array.isArray(subscriber.email_tags) ? (subscriber.email_tags as string[]) : null,
      )
      const existingTagCount = Array.isArray(subscriber.email_tags) ? subscriber.email_tags.length : 0

      if (wasGenerated || !subscriber.source || normalizedEmailTags.length !== existingTagCount) {
        await sql`
          UPDATE freebie_subscribers
          SET access_token = ${accessToken},
              source = COALESCE(source, ${incomingSource}),
              email_tags = ${normalizedEmailTags}::text[],
              updated_at = NOW()
          WHERE id = ${subscriber.id}
        `
      }

      if (hasResendApiKey()) {
        const firstName = firstNameFrom(subscriber.name, trimmedName)
        const resendResult = await addOrUpdateResendContact(normalizedEmail, firstName, {
          source: "freebie-selfie-guide",
          status: "lead",
          product: "sselfie-guide",
          journey: "nurture",
          segment: "freebie-subscriber",
          signup_date: new Date().toISOString().split("T")[0],
        })

        if (resendResult.success && resendResult.contactId) {
          await sql`
            UPDATE freebie_subscribers
            SET resend_contact_id = ${resendResult.contactId},
                updated_at = NOW()
            WHERE id = ${subscriber.id}
          `
        }
      }

      const accessUrl = selfieGuideAccessUrl(accessToken)
      const cooldownActive = await recentlySentDeliveryEmail(normalizedEmail, subscriber.guide_access_email_sent_at)

      if (cooldownActive) {
        console.log("[v0] Recent guide delivery email found, returning access without resend")
        return NextResponse.json({
          success: true,
          accessToken,
          accessUrl,
          emailSent: false,
          emailError: null,
          emailSkippedReason: "cooldown",
          alreadySubscribed: true,
          message: "You already have access. Check your inbox or open the guide here.",
        })
      }

      console.log("[v0] Existing subscriber found, resending guide access email")
      let emailSent = false
      let emailError = null
      try {
        const delivery = await sendGuideDeliveryEmail({
          email: normalizedEmail,
          firstName: firstNameFrom(subscriber.name, trimmedName),
          accessUrl,
        })
        emailSent = delivery.emailSent
        emailError = delivery.emailError

        if (emailSent) {
          await sql`
            UPDATE freebie_subscribers
            SET guide_access_email_sent = true,
                guide_access_email_sent_at = NOW(),
                updated_at = NOW()
            WHERE id = ${subscriber.id}
          `
        }
      } catch (error: any) {
        console.error("[v0] Error sending email:", error)
        emailError = error.message || "Unknown email error"
      }

      return NextResponse.json({
        success: true,
        accessToken,
        accessUrl,
        emailSent,
        emailError,
        alreadySubscribed: true,
        message: emailSent
          ? "Your guide is on the way. You can also open it now."
          : "You already have access. Check your inbox or open the guide here.",
      })
    }

    const accessToken = crypto.randomUUID()
    const normalizedEmailTags = normalizeFreebieEmailTags(null)
    console.log("[v0] Generated access token for new subscriber")

    console.log("[v0] Inserting new subscriber into database")
    const result = await sql`
      INSERT INTO freebie_subscribers (
        email, name, source, access_token, utm_source, utm_medium, 
        utm_campaign, referrer, user_agent, email_tags, created_at, updated_at,
        guide_access_email_sent, guide_access_email_sent_at
      )
      VALUES (
        ${normalizedEmail},
        ${trimmedName},
        ${incomingSource},
        ${accessToken},
        ${utm_source || null},
        ${utm_medium || null},
        ${utm_campaign || null},
        ${referrer || null},
        ${user_agent || null},
        ${normalizedEmailTags}::text[],
        NOW(),
        NOW(),
        false,
        NULL
      )
      RETURNING id, access_token
    `

    if (!result || result.length === 0) {
      console.error("[v0] Failed to insert subscriber")
      return NextResponse.json(
        {
          error: "Failed to save subscription",
        },
        { status: 500 },
      )
    }

    const newSubscriber = result[0]
    console.log("[v0] Subscriber created with ID:", newSubscriber.id)

    const firstName = firstNameFrom(trimmedName, trimmedName)
    const resendResult = await addOrUpdateResendContact(normalizedEmail, firstName, {
      source: "freebie-selfie-guide",
      status: "lead",
      product: "sselfie-guide",
      journey: "nurture",
      segment: "freebie-subscriber",
      signup_date: new Date().toISOString().split("T")[0],
    })

    if (resendResult.success && resendResult.contactId) {
      console.log(`[v0] Added to Resend audience with ID: ${resendResult.contactId}`)

      await sql`
        UPDATE freebie_subscribers 
        SET resend_contact_id = ${resendResult.contactId},
            updated_at = NOW()
        WHERE id = ${newSubscriber.id}
      `
    } else {
      console.error(`[CRITICAL] Freebie Resend sync failed: ${normalizedEmail} - ${resendResult.error}`)
    }

    let emailSent = false
    let emailError = null
    const accessUrl = selfieGuideAccessUrl(accessToken)
    try {
      console.log("[v0] Sending guide access email via Resend")
      const delivery = await sendGuideDeliveryEmail({
        firstName,
        email: normalizedEmail,
        accessUrl,
      })
      emailSent = delivery.emailSent
      emailError = delivery.emailError

      if (emailSent) {
        console.log("[v0] Guide access email sent successfully")
        await sql`
          UPDATE freebie_subscribers
          SET guide_access_email_sent = true,
              guide_access_email_sent_at = NOW(),
              updated_at = NOW()
          WHERE id = ${newSubscriber.id}
        `
      }
    } catch (error: any) {
      console.error("[v0] Error sending email:", error)
      emailError = error.message || "Unknown email error"

      if (error.message && error.message.includes("domain is not verified")) {
        console.error(
          "[v0] IMPORTANT: Resend domain not verified. Please verify sselfie.ai at https://resend.com/domains",
        )
        emailError = "Domain not verified in Resend. Please verify sselfie.ai at https://resend.com/domains"
      }
    }

    console.log("[v0] Returning success response")
    return NextResponse.json({
      success: true,
      accessToken: newSubscriber.access_token,
      accessUrl,
      emailSent,
      emailError,
      message: emailSent ? "Your guide is on the way. You can also open it now." : "Open your guide here.",
    })
  } catch (error) {
    console.error("[v0] Error in POST handler:", error)
    return NextResponse.json(
      {
        error: "Failed to process subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
