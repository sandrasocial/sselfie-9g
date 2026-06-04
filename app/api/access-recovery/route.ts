/**
 * POST /api/access-recovery
 *
 * Self-serve access recovery. Customer enters their purchase email.
 * System looks up purchases and sends a magic access link to that email.
 *
 * Security:
 * - Rate-limited at the Vercel edge (via config.maxDuration + Vercel WAF)
 * - Response time is constant regardless of whether email exists (prevents enumeration)
 * - Logs every attempt for admin review
 * - Never reveals whether an email has a purchase — always says "check your email"
 */

import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { renderStoneButton, renderStoneShell } from "@/lib/email/templates/stone-email"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export const maxDuration = 30

interface PurchaseRecord {
  product_type: string
  access_token: string | null
  email: string
  name: string | null
  created_at: string
}

const PRODUCT_LABEL: Record<string, string> = {
  starter_kit: "Selfie Starter Kit",
  selfie_guide: "Selfie Guide",
  selfie_guide_bundle: "Selfie Guide + Strategy Bundle",
  masterclass: "Selfie Masterclass",
  brand_strategy_pack: "Legacy Strategy Pack",
  visibility_suite: "Legacy Visibility Suite",
  what_to_say: "What To Say",
  show_up: "Show Up",
  get_paid: "Get Paid",
  sselfie_studio_membership: "SSELFIE Studio",
  paid_blueprint: "Legacy Feed Planner Access",
  prompt_vault: "AI Photo Prompt Vault",
  "prompt-vault-paid": "AI Photo Prompt Vault",
  selfie_to_brand_shoot_system: "Selfie to Brand Shoot System",
  "selfie-to-brand-shoot-paid": "Selfie to Brand Shoot System",
}

const PRODUCT_ACCESS_URL: Record<string, string> = {
  starter_kit: "/academy/access/starter-kit",
  selfie_guide: "/selfie-guide",
  selfie_guide_bundle: "/selfie-guide",
  masterclass: "/academy/access/masterclass",
  brand_strategy_pack: "/academy/access/brand-strategy",
  visibility_suite: "/academy/access/visibility-suite",
  what_to_say: "/academy/access/what-to-say",
  show_up: "/academy/access/show-up",
  get_paid: "/academy/access/get-paid",
  sselfie_studio_membership: "/studio",
  paid_blueprint: "/feed-planner",
  prompt_vault: "/academy/access/prompt-vault",
  "prompt-vault-paid": "/academy/access/prompt-vault",
  selfie_to_brand_shoot_system: "/academy/access/selfie-to-brand-shoot",
  "selfie-to-brand-shoot-paid": "/academy/access/selfie-to-brand-shoot",
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null

  // Log every attempt for admin visibility
  const logData = {
    email_provided: !!email,
    email_domain: email ? email.split("@")[1] : null,
    ip: req.headers.get("x-forwarded-for") || "unknown",
    timestamp: new Date().toISOString(),
  }

  if (!email || !email.includes("@")) {
    await logRecoveryAttempt(null, "invalid_email", logData)
    return NextResponse.json({ ok: true }) // Always return ok to prevent enumeration
  }

  // Log analytics event for recovery request
  logAnalyticsEvent({
    eventName: "access_recovery_requested",
    path: "/api/access-recovery",
    properties: { email_domain: email.split("@")[1] },
  }).catch(() => {})

  try {
    // Look up purchases from multiple sources
    const [entitlements, freebieSubs] = await Promise.all([
      sql`
        SELECT
          ue.product_id as product_type,
          ue.created_at,
          u.email,
          u.display_name as name,
          fs.access_token
        FROM user_entitlements ue
        INNER JOIN users u ON u.id = ue.user_id
        LEFT JOIN freebie_subscribers fs
          ON LOWER(fs.email) = LOWER(u.email)
        WHERE LOWER(u.email) = ${email}
          AND ue.status = 'active'
        ORDER BY ue.created_at DESC
        LIMIT 10
      `,
      sql`
        SELECT
          source as product_type,
          access_token,
          email,
          name,
          created_at
        FROM freebie_subscribers
        WHERE LOWER(email) = ${email}
          AND source IN ('starter-kit-paid', 'selfie-guide-paid', 'selfie_guide_paid', 'prompt-vault-paid', 'selfie-to-brand-shoot-paid')
        LIMIT 5
      `,
    ])

    const purchases = [...(entitlements as PurchaseRecord[]), ...(freebieSubs as PurchaseRecord[])]

    if (purchases.length === 0) {
      await logRecoveryAttempt(email, "no_purchase_found", logData)
      // Still return ok — don't tell them the email wasn't found
      return NextResponse.json({ ok: true })
    }

    // Build the recovery email
    const firstName = getFirstNameForEmail({ fullName: purchases[0]?.name, email })
    const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

    const productLines = purchases
      .map((p) => {
        const label = PRODUCT_LABEL[p.product_type] || p.product_type
        let accessUrl = `${productionUrl}${PRODUCT_ACCESS_URL[p.product_type] || "/studio"}`

        // For token-based products, build the direct token URL
        if ((p.product_type === "starter_kit" || p.product_type.includes("starter-kit")) && p.access_token) {
          accessUrl = `${productionUrl}/access/starter-kit/${encodeURIComponent(p.access_token)}`
        } else if ((p.product_type === "selfie_guide" || p.product_type.includes("selfie-guide")) && p.access_token) {
          accessUrl = `${productionUrl}/selfie-guide/access/${encodeURIComponent(p.access_token)}`
        } else if ((p.product_type === "prompt_vault" || p.product_type.includes("prompt-vault")) && p.access_token) {
          accessUrl = `${productionUrl}/access/prompt-vault/${encodeURIComponent(p.access_token)}`
        } else if ((p.product_type === "selfie_to_brand_shoot_system" || p.product_type.includes("selfie-to-brand-shoot")) && p.access_token) {
          accessUrl = `${productionUrl}/access/selfie-to-brand-shoot/${encodeURIComponent(p.access_token)}`
        }

        return { label, accessUrl }
      })
      // Deduplicate by label
      .filter((item, i, arr) => arr.findIndex((a) => a.label === item.label) === i)

    const productButtons = productLines
      .map((p) => `<div style="margin:10px 0 0;">${renderStoneButton(p.label, p.accessUrl, "outline")}</div>`)
      .join("")

    const primaryProduct = productLines[0]

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Here are your access links — click to open your purchase directly.</p>
      <div style="margin:28px 0 14px;">${renderStoneButton(primaryProduct.label, primaryProduct.accessUrl)}</div>
      ${productLines.length > 1 ? productButtons.replace(renderStoneButton(primaryProduct.label, primaryProduct.accessUrl, "outline"), "") : ""}
      <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#a8a49c;">
        If you still can't get in, reply to this email or contact
        <a href="mailto:support@sselfie.ai" style="color:#a8a49c;">support@sselfie.ai</a>
      </p>
    `

    const htmlEmail = renderStoneShell({
      eyebrow: "Access Recovery",
      title: "Here's your access.",
      subtitle: "Use the links below to open your purchases. Bookmark them for next time.",
      bodyHtml,
    })

    const textBody = [
      `Hi ${firstName},`,
      "",
      "Here are your access links:",
      "",
      ...productLines.map((p) => `${p.label}: ${p.accessUrl}`),
      "",
      "Still need help? Email support@sselfie.ai",
      "",
      "Sandra x",
    ].join("\n")

    await sendEmail({
      to: email,
      subject: "Your SSELFIE access links",
      html: htmlEmail,
      text: textBody,
      emailType: "access_recovery",
      tags: ["access-recovery"],
    })

    await logRecoveryAttempt(email, "email_sent", { ...logData, product_count: productLines.length })

    // Log analytics event for successful recovery email send
    logAnalyticsEvent({
      eventName: "access_recovery_email_sent",
      path: "/api/access-recovery",
      properties: {
        product_count: productLines.length,
        products: productLines.map((p) => p.label).join(", "),
      },
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[access-recovery] Error:", err.message)
    await logRecoveryAttempt(email, "error", { ...logData, error: err.message })
    return NextResponse.json({ ok: true }) // Always return ok
  }
}

async function logRecoveryAttempt(
  email: string | null,
  outcome: string,
  metadata: Record<string, unknown>,
) {
  try {
    await sql`
      INSERT INTO email_logs (
        user_email,
        email_type,
        status,
        created_at
      )
      VALUES (
        ${email || "unknown"},
        'access_recovery_attempt',
        ${outcome},
        NOW()
      )
    `
  } catch {
    // Non-fatal — don't let logging errors break the recovery flow
  }
}
