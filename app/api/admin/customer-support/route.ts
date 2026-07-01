/**
 * GET  /api/admin/customer-support?email=...  - look up a customer by email
 * POST /api/admin/customer-support            - resend delivery email for a product
 *
 * Admin-only. This is the canonical customer support surface for purchase
 * access, delivery history, and in-app feedback threads.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generateStarterKitDay0DeliveryEmail } from "@/lib/email/templates/starter-kit-day0-delivery"
import { generateSelfieGuidePaidDeliveryEmail } from "@/lib/email/templates/selfie-guide-paid-delivery"
import {
  generateAcademyProductDeliveryEmail,
  generateVisibilitySuiteDeliveryEmail,
} from "@/lib/email/templates/academy-product-delivery"
import { generateMasterclassDay0DeliveryEmail } from "@/lib/email/templates/masterclass-day0-delivery"
import { generatePromptVaultDeliveryEmail } from "@/lib/email/templates/prompt-vault-delivery"

export const dynamic = "force-dynamic"
const ADMIN_EMAIL = "ssa@ssasocial.com"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

async function requireAdmin(_req: NextRequest): Promise<NextResponse | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: "email param required" }, { status: 400 })
  }

  const [userRows, entitlements, payments, emailLogs, feedbackRows, freebieSubs] =
    await Promise.all([
      sql`
        SELECT
          id,
          email,
          COALESCE(display_name, NULLIF(CONCAT_WS(' ', first_name, last_name), '')) AS full_name,
          created_at,
          stripe_customer_id
        FROM users
        WHERE LOWER(email) = ${email}
        LIMIT 1
      `,
      sql`
        SELECT ue.product_id, ue.status, ue.source, ue.source_ref, ue.created_at
        FROM user_entitlements ue
        INNER JOIN users u ON u.id = ue.user_id
        WHERE LOWER(u.email) = ${email}
        ORDER BY ue.created_at DESC
      `,
      sql`
        SELECT sp.product_type, sp.amount_cents, sp.currency, sp.status, sp.payment_date, sp.stripe_payment_id
        FROM stripe_payments sp
        INNER JOIN users u ON u.id = sp.user_id
        WHERE LOWER(u.email) = ${email}
        ORDER BY sp.payment_date DESC
        LIMIT 20
      `,
      sql`
        SELECT user_email, email_type, status, sent_at, created_at
        FROM email_logs
        WHERE LOWER(user_email) = ${email}
        ORDER BY created_at DESC
        LIMIT 30
      `,
      sql`
        SELECT
          id,
          type,
          subject,
          message,
          status,
          images,
          admin_reply,
          replied_at,
          created_at
        FROM feedback
        WHERE LOWER(user_email) = ${email}
        ORDER BY
          CASE status
            WHEN 'new' THEN 0
            WHEN 'reviewing' THEN 1
            ELSE 2
          END,
          created_at DESC
        LIMIT 10
      `.catch((error) => {
        console.error("[customer-support] Feedback lookup failed:", error)
        return []
      }),
      sql`
        SELECT id, source, access_token, email_tags, guide_access_email_sent, guide_access_email_sent_at, created_at
        FROM freebie_subscribers
        WHERE LOWER(email) = ${email}
        ORDER BY created_at DESC
        LIMIT 5
      `,
    ])

  // Build access links
  const accessLinks: Array<{ product: string; url: string }> = []
  for (const sub of freebieSubs as any[]) {
    if (sub.access_token) {
      if (sub.source?.includes("starter-kit")) {
        accessLinks.push({
          product: "Starter Kit (token)",
          url: `${SITE_URL}/access/starter-kit/${sub.access_token}`,
        })
      } else if (sub.source?.includes("selfie-guide") || sub.source?.includes("selfie_guide")) {
        accessLinks.push({
          product: "Selfie Guide (token)",
          url: `${SITE_URL}/selfie-guide/access/${sub.access_token}`,
        })
      } else if (sub.source?.includes("prompt-vault")) {
        accessLinks.push({
          product: "Prompt Vault (token)",
          url: `${SITE_URL}/access/prompt-vault/${sub.access_token}`,
        })
      }
    }
  }

  const user = (userRows as any[])[0] || null

  return NextResponse.json({
    user,
    entitlements,
    payments,
    emailLogs,
    feedback: feedbackRows,
    freebieSubs,
    accessLinks,
  })
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const { email, action, productId } = body

  if (!email || !action) {
    return NextResponse.json({ error: "email and action required" }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  if (action === "resend_access") {
    // Look up the customer's access token and resend the appropriate delivery email
    const [freebieSubs, userRows] = await Promise.all([
      sql`
        SELECT access_token, source, name
        FROM freebie_subscribers
        WHERE LOWER(email) = ${normalizedEmail}
        LIMIT 1
      `,
      sql`
        SELECT COALESCE(display_name, NULLIF(CONCAT_WS(' ', first_name, last_name), '')) AS full_name
        FROM users
        WHERE LOWER(email) = ${normalizedEmail}
        LIMIT 1
      `,
    ])

    const sub = (freebieSubs as any[])[0]
    const user = (userRows as any[])[0]
    const firstName = user?.full_name || sub?.name || normalizedEmail.split("@")[0]
    const accessToken = sub?.access_token

    let emailSent = false
    let emailError: string | null = null

    if (productId === "starter_kit" || sub?.source?.includes("starter-kit")) {
      const accessUrl = accessToken
        ? `${SITE_URL}/access/starter-kit/${encodeURIComponent(accessToken)}`
        : `${SITE_URL}/academy/access/starter-kit`
      const email = generateStarterKitDay0DeliveryEmail({
        firstName,
        recipientEmail: normalizedEmail,
        accessUrl,
        presetDownloadUrl: process.env.STARTER_KIT_PRESET_DOWNLOAD_URL || undefined,
      })
      const result = await sendEmail({
        to: normalizedEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: "starter_kit_delivery_resend",
        tags: ["admin-resend", "starter-kit"],
      })
      emailSent = result.success
      emailError = result.success ? null : (result.error as string)
    } else if (productId === "prompt_vault" || sub?.source?.includes("prompt-vault")) {
      const accessUrl = accessToken
        ? `${SITE_URL}/access/prompt-vault/${encodeURIComponent(accessToken)}`
        : `${SITE_URL}/prompt-vault`
      const email = generatePromptVaultDeliveryEmail({
        firstName,
        accessUrl,
      })
      const result = await sendEmail({
        to: normalizedEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: "prompt_vault_delivery_resend",
        tags: ["admin-resend", "prompt-vault"],
      })
      emailSent = result.success
      emailError = result.success ? null : (result.error as string)
    } else if (productId === "selfie_guide") {
      const email = generateSelfieGuidePaidDeliveryEmail({
        firstName,
        email: normalizedEmail,
        accessUrl: accessToken
          ? `${SITE_URL}/selfie-guide/access/${encodeURIComponent(accessToken)}`
          : `${SITE_URL}/selfie-guide`,
      })
      const result = await sendEmail({
        to: normalizedEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: "selfie_guide_delivery_resend",
        tags: ["admin-resend", "selfie-guide"],
      })
      emailSent = result.success
      emailError = result.success ? null : (result.error as string)
    } else if (productId === "masterclass") {
      const email = generateMasterclassDay0DeliveryEmail({
        firstName,
        courseUrl: `${SITE_URL}/academy/access/masterclass`,
        brandStrategyUrl: `${SITE_URL}/academy/access/brand-strategy`,
      })
      const result = await sendEmail({
        to: normalizedEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: "masterclass_delivery_resend",
        tags: ["admin-resend", "masterclass"],
      })
      emailSent = result.success
      emailError = result.success ? null : (result.error as string)
    } else if (productId === "visibility_suite") {
      const email = generateVisibilitySuiteDeliveryEmail({
        firstName,
        email: normalizedEmail,
        accessUrl: `${SITE_URL}/academy/access/visibility-suite`,
      })
      const result = await sendEmail({
        to: normalizedEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: "visibility_suite_delivery_resend",
        tags: ["admin-resend", "visibility-suite"],
      })
      emailSent = result.success
      emailError = result.success ? null : (result.error as string)
    } else if (productId) {
      // Generic academy product
      const email = generateAcademyProductDeliveryEmail({
        productId,
        firstName,
        email: normalizedEmail,
        accessUrl: `${SITE_URL}/academy`,
      })
      const result = await sendEmail({
        to: normalizedEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: "academy_delivery_resend",
        tags: ["admin-resend", productId],
      })
      emailSent = result.success
      emailError = result.success ? null : (result.error as string)
    } else {
      return NextResponse.json({ error: "productId required for resend_access" }, { status: 400 })
    }

    // Log the resend
    await sql`
      INSERT INTO email_logs (user_email, email_type, status, created_at)
      VALUES (${normalizedEmail}, 'admin_resend', ${emailSent ? "sent" : "failed"}, NOW())
    `.catch(() => {})

    return NextResponse.json({
      ok: emailSent,
      error: emailError,
      message: emailSent
        ? `Delivery email resent to ${normalizedEmail}`
        : `Failed to send: ${emailError}`,
    })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
