// WEBHOOK-01 — helpers shared by multiple product fulfillment handlers.
// Moved VERBATIM from app/api/webhooks/stripe/route.ts (no behavior change).

import { sql } from "@/lib/db/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { markCheckoutAttributionCompleted } from "@/lib/revenue-engine/checkout-attribution"

export async function generatePasswordSetupLinkForPurchase(
  userId: string | null | undefined,
  email: string,
  nextAfterSetup = "/studio"
) {
  if (!userId) {
    return undefined
  }

  try {
    const userRecord = await sql`
      SELECT password_setup_complete FROM users WHERE id = ${userId} LIMIT 1
    `

    if (userRecord[0]?.password_setup_complete !== false) {
      return undefined
    }

    const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
    const redirectTarget = `${productionUrl}/auth/setup-password?next=${encodeURIComponent(nextAfterSetup)}`
    const supabaseAdmin = createAdminClient()
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: redirectTarget },
    })

    if (resetError || !resetData?.properties?.action_link) {
      return undefined
    }

    let link = resetData.properties.action_link

    if (link.includes("localhost") || link.includes("supabase.co")) {
      const url = new URL(link)
      const token = url.searchParams.get("token")
      const type = url.searchParams.get("type") || "recovery"
      if (token) {
        link = `${productionUrl}/auth/confirm?token=${token}&type=${type}&redirect_to=${encodeURIComponent(`/auth/setup-password?next=${encodeURIComponent(nextAfterSetup)}`)}`
      }
    }

    return link
  } catch (error: any) {
    console.error("[v0] Error generating password setup link for purchase:", error.message)
    return undefined
  }
}

export async function markEmailLogConversionForCheckout(params: {
  userEmail: string
  emailType?: string | null
  allowFallback?: boolean
}) {
  const emailType = typeof params.emailType === "string" ? params.emailType.trim() : ""

  try {
    if (emailType) {
      const convertedByType = await sql`
        WITH candidate AS (
          SELECT id
          FROM email_logs
          WHERE LOWER(user_email) = LOWER(${params.userEmail})
            AND email_type = ${emailType}
            AND converted = false
            AND sent_at >= NOW() - INTERVAL '30 days'
          ORDER BY
            clicked_at DESC NULLS LAST,
            opened_at DESC NULLS LAST,
            sent_at DESC NULLS LAST
          LIMIT 1
        )
        UPDATE email_logs
        SET converted = true, converted_at = NOW()
        WHERE id IN (SELECT id FROM candidate)
        RETURNING id
      `

      if (convertedByType.length > 0) {
        console.log(
          `[v0] Marked email_logs ${convertedByType[0].id} as converted via email_type=${emailType}`
        )
        return convertedByType[0].id
      }
    }

    if (!params.allowFallback) {
      return null
    }

    const convertedFallback = await sql`
      WITH candidate AS (
        SELECT id
        FROM email_logs
        WHERE LOWER(user_email) = LOWER(${params.userEmail})
          AND converted = false
          AND sent_at >= NOW() - INTERVAL '7 days'
        ORDER BY
          clicked_at DESC NULLS LAST,
          opened_at DESC NULLS LAST,
          sent_at DESC NULLS LAST
        LIMIT 1
      )
      UPDATE email_logs
      SET converted = true, converted_at = NOW()
      WHERE id IN (SELECT id FROM candidate)
      RETURNING id
    `

    if (convertedFallback.length > 0) {
      console.log(`[v0] Marked email_logs ${convertedFallback[0].id} as converted via fallback`)
      return convertedFallback[0].id
    }

    console.warn("[v0] No recent email_logs found to mark converted")
    return null
  } catch (error) {
    console.error("[v0] Failed to mark checkout email conversion:", error)
    return null
  }
}

export async function markRevenueEnginePurchase(params: {
  sessionId?: string | null
  stripeSubscriptionId?: string | null
  userId?: string | null
  userEmail?: string | null
  stripeCustomerId?: string | null
  stripePaymentId?: string | null
  stripeInvoiceId?: string | null
  purchaseValueCents?: number | null
  purchaseCurrency?: string | null
  purchasedAt?: Date | string | null
  emailType?: string | null
  campaignId?: string | null
}) {
  await markCheckoutAttributionCompleted({
    sessionId: params.sessionId || null,
    stripeSubscriptionId: params.stripeSubscriptionId || null,
    userId: params.userId || null,
    userEmail: params.userEmail || null,
    stripeCustomerId: params.stripeCustomerId || null,
    stripePaymentId: params.stripePaymentId || null,
    stripeInvoiceId: params.stripeInvoiceId || null,
    purchaseValueCents: params.purchaseValueCents || null,
    purchaseCurrency: params.purchaseCurrency || null,
    purchasedAt: params.purchasedAt || null,
  })

  if (params.userEmail && params.emailType) {
    await markEmailLogConversionForCheckout({
      userEmail: params.userEmail,
      emailType: params.emailType,
      allowFallback: false,
    })
  }

  const campaignId = params.campaignId ? Number.parseInt(params.campaignId, 10) : Number.NaN
  if (!params.userEmail || !Number.isFinite(campaignId) || campaignId <= 0) {
    return
  }

  try {
    await sql`
      UPDATE email_logs
      SET
        converted = TRUE,
        converted_at = COALESCE(converted_at, NOW())
      WHERE LOWER(user_email) = LOWER(${params.userEmail})
        AND campaign_id = ${campaignId}
    `
  } catch (error) {
    console.error("[v0] Failed to mark email conversion attribution:", error)
  }
}
