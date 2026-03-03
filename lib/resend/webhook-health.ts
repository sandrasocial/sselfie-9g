import { sql } from "@/lib/db/client"


export interface WebhookHealthStatus {
  webhooksReceived24h: number
  webhookSecretSet: boolean
  healthy: boolean
}

export async function checkWebhookHealth(): Promise<WebhookHealthStatus> {
  const webhookSecretSet = Boolean(process.env.RESEND_WEBHOOK_SECRET)

  try {
    const recentWebhooks = await sql`
      SELECT COUNT(*) as count
      FROM email_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND resend_message_id IS NOT NULL
    `

    const webhooksReceived24h = Number(recentWebhooks[0]?.count || 0)

    return {
      webhooksReceived24h,
      webhookSecretSet,
      healthy: webhookSecretSet && webhooksReceived24h > 0,
    }
  } catch (error) {
    console.error("[resend] Failed to check webhook health:", error)
    return {
      webhooksReceived24h: 0,
      webhookSecretSet,
      healthy: false,
    }
  }
}
