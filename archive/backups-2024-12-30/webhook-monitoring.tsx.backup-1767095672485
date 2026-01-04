import { sendEmail } from "@/lib/email/send-email"
import { neon } from "@/lib/db"

const sql = neon(process.env.DATABASE_URL!)

export interface WebhookError {
  eventType: string
  errorMessage: string
  errorStack?: string
  eventData?: any
  timestamp: Date
}

// Store webhook errors in database for monitoring
export async function logWebhookError(error: WebhookError): Promise<void> {
  try {
    await sql`
      INSERT INTO webhook_errors (
        event_type,
        error_message,
        error_stack,
        event_data,
        created_at
      )
      VALUES (
        ${error.eventType},
        ${error.errorMessage},
        ${error.errorStack || null},
        ${JSON.stringify(error.eventData)},
        NOW()
      )
    `
    console.log("[v0] Webhook error logged to database")
  } catch (err) {
    console.error("[v0] Failed to log webhook error:", err)
  }
}

// Send alert email for critical webhook errors
export async function alertWebhookError(error: WebhookError): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || "hello@sselfie.ai"

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .error-box { background: white; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0; }
          .timestamp { color: #6b7280; font-size: 14px; }
          code { background: #1f2937; color: #f9fafb; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">⚠️ Webhook Error Alert</h2>
          </div>
          <div class="content">
            <div class="error-box">
              <p><strong>Event Type:</strong> <code>${error.eventType}</code></p>
              <p><strong>Error Message:</strong></p>
              <p style="color: #dc2626;">${error.errorMessage}</p>
              <p class="timestamp"><strong>Timestamp:</strong> ${error.timestamp.toISOString()}</p>
            </div>
            ${
              error.errorStack
                ? `
              <div class="error-box">
                <p><strong>Stack Trace:</strong></p>
                <pre style="overflow-x: auto; font-size: 12px;">${error.errorStack}</pre>
              </div>
            `
                : ""
            }
            <p style="margin-top: 20px;">
              <strong>Action Required:</strong> Please investigate this error in the webhook logs and database.
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
WEBHOOK ERROR ALERT

Event Type: ${error.eventType}
Error Message: ${error.errorMessage}
Timestamp: ${error.timestamp.toISOString()}

${error.errorStack ? `Stack Trace:\n${error.errorStack}` : ""}

Action Required: Please investigate this error in the webhook logs and database.
  `

  try {
    await sendEmail({
      to: adminEmail,
      subject: `🚨 Webhook Error: ${error.eventType}`,
      html,
      text,
      tags: ["webhook-error", "alert"],
    })
    console.log("[v0] Webhook error alert sent to admin")
  } catch (err) {
    console.error("[v0] Failed to send webhook error alert:", err)
  }
}

// Check if error is critical and requires immediate attention
export function isCriticalError(eventType: string, errorMessage: string): boolean {
  const criticalEvents = ["checkout.session.completed", "customer.subscription.created", "invoice.payment_succeeded"]

  const criticalKeywords = ["payment", "subscription", "credit", "account creation", "database"]

  // Critical if it's a payment-related event
  if (criticalEvents.includes(eventType)) {
    return true
  }

  // Critical if error message contains payment/subscription keywords
  const lowerError = errorMessage.toLowerCase()
  return criticalKeywords.some((keyword) => lowerError.includes(keyword))
}
