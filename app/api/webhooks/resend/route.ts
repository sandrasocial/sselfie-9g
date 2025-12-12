import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Resend Webhook Handler
 * 
 * Handles Resend webhook events for email tracking:
 * - email.sent: Email was sent
 * - email.delivered: Email was delivered
 * - email.opened: Email was opened
 * - email.clicked: Link in email was clicked
 * - email.bounced: Email bounced
 * - email.complained: User marked as spam
 * 
 * POST /api/webhooks/resend
 * 
 * Webhook URL in Resend: https://sselfie.ai/api/webhooks/resend
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[v0] [Resend Webhook] Event received at:", new Date().toISOString())

    const body = await request.json()
    const eventType = body.type
    const eventData = body.data

    console.log("[v0] [Resend Webhook] Event type:", eventType)
    console.log("[v0] [Resend Webhook] Event data:", JSON.stringify(eventData, null, 2))

    // Verify webhook signature if RESEND_WEBHOOK_SECRET is set
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get("resend-signature")
      if (signature) {
        // Resend uses HMAC SHA256 for webhook signatures
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(JSON.stringify(body))
          .digest("hex")

        if (signature !== expectedSignature) {
          console.error("[v0] [Resend Webhook] Invalid signature")
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        }
        console.log("[v0] [Resend Webhook] ✅ Signature verified")
      }
    } else {
      console.warn("[v0] [Resend Webhook] ⚠️ RESEND_WEBHOOK_SECRET not set - skipping signature verification")
    }

    // Extract email and message ID from event data
    const recipientEmail = eventData?.email || eventData?.to
    const messageId = eventData?.email_id || eventData?.message_id || eventData?.id

    if (!recipientEmail && !messageId) {
      console.warn("[v0] [Resend Webhook] No email or message ID in event data")
      return NextResponse.json({ received: true, warning: "No email or message ID" })
    }

    // Handle different event types
    switch (eventType) {
      case "email.sent":
        // Email was sent (already logged in send-email.ts, but update if needed)
        if (messageId && recipientEmail) {
          await sql`
            UPDATE email_logs
            SET resend_message_id = ${messageId}, status = 'sent'
            WHERE user_email = ${recipientEmail}
            AND resend_message_id IS NULL
            ORDER BY sent_at DESC
            LIMIT 1
          `
          console.log(`[v0] [Resend Webhook] ✅ Updated email_logs for sent: ${recipientEmail}`)
        }
        break

      case "email.delivered":
        // Email was delivered successfully
        if (messageId) {
          await sql`
            UPDATE email_logs
            SET status = 'delivered'
            WHERE resend_message_id = ${messageId}
          `
          console.log(`[v0] [Resend Webhook] ✅ Marked as delivered: ${messageId}`)
        }
        break

      case "email.opened":
        // Email was opened
        if (messageId) {
          const openedAt = eventData?.timestamp ? new Date(eventData.timestamp) : new Date()
          
          // Update email_logs
          const emailLog = await sql`
            UPDATE email_logs
            SET opened = true, opened_at = ${openedAt}
            WHERE resend_message_id = ${messageId}
            AND opened = false
            RETURNING user_email, email_type
          `
          
          console.log(`[v0] [Resend Webhook] ✅ Marked as opened: ${messageId}`)
          
          // Update A/B test results if this is an A/B test email
          if (emailLog && emailLog.length > 0) {
            const log = emailLog[0]
            const emailType = log.email_type as string
            const abTestMatch = emailType.match(/ab_test_(\d+)_variant_([AB])/)
            if (abTestMatch) {
              const testId = parseInt(abTestMatch[1])
              const { updateABTestResults } = await import("@/lib/email/ab-testing")
              await updateABTestResults(testId, log.user_email, "opened")
              console.log(`[v0] [Resend Webhook] ✅ Updated A/B test ${testId} for opened`)
            }
          }
        }
        break

      case "email.clicked":
        // Link in email was clicked
        if (messageId) {
          const clickedAt = eventData?.timestamp ? new Date(eventData.timestamp) : new Date()
          const clickedUrl = eventData?.link || eventData?.url || null
          
          // Update email_logs
          const emailLog = await sql`
            UPDATE email_logs
            SET clicked = true, clicked_at = ${clickedAt}
            WHERE resend_message_id = ${messageId}
            AND clicked = false
            RETURNING user_email, email_type
          `
          
          console.log(`[v0] [Resend Webhook] ✅ Marked as clicked: ${messageId} (URL: ${clickedUrl})`)
          
          // Update A/B test results if this is an A/B test email
          if (emailLog && emailLog.length > 0) {
            const log = emailLog[0]
            const emailType = log.email_type as string
            const abTestMatch = emailType.match(/ab_test_(\d+)_variant_([AB])/)
            if (abTestMatch) {
              const testId = parseInt(abTestMatch[1])
              const { updateABTestResults } = await import("@/lib/email/ab-testing")
              await updateABTestResults(testId, log.user_email, "clicked")
              console.log(`[v0] [Resend Webhook] ✅ Updated A/B test ${testId} for clicked`)
            }
          }
        }
        break

      case "email.bounced":
        // Email bounced (hard or soft bounce)
        if (messageId) {
          const bounceType = eventData?.bounce_type || "hard"
          const bounceReason = eventData?.bounce_reason || "Unknown"
          
          await sql`
            UPDATE email_logs
            SET status = 'bounced', error_message = ${`Bounced: ${bounceType} - ${bounceReason}`}
            WHERE resend_message_id = ${messageId}
          `
          console.log(`[v0] [Resend Webhook] ⚠️ Marked as bounced: ${messageId} (${bounceType})`)
        }
        break

      case "email.complained":
        // User marked email as spam
        if (messageId) {
          await sql`
            UPDATE email_logs
            SET status = 'complained', error_message = 'User marked as spam'
            WHERE resend_message_id = ${messageId}
          `
          console.log(`[v0] [Resend Webhook] ⚠️ Marked as complained (spam): ${messageId}`)
          
          // Also mark in blueprint_subscribers and welcome_back_sequence to stop sending
          if (recipientEmail) {
            await sql`
              UPDATE blueprint_subscribers
              SET converted_to_user = true, updated_at = NOW()
              WHERE email = ${recipientEmail}
            `
            await sql`
              UPDATE welcome_back_sequence
              SET converted = true, updated_at = NOW()
              WHERE user_email = ${recipientEmail}
            `
            console.log(`[v0] [Resend Webhook] ✅ Stopped sequences for ${recipientEmail} (spam complaint)`)
          }
        }
        break

      default:
        console.log(`[v0] [Resend Webhook] Unhandled event type: ${eventType}`)
    }

    return NextResponse.json({ received: true, eventType })
  } catch (error: any) {
    console.error("[v0] [Resend Webhook] Error processing webhook:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// Handle GET requests for webhook verification (some services require this)
export async function GET() {
  return NextResponse.json({
    message: "Resend webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}

