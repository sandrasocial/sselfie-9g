import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { ensureBrandEngineApplicationsSchema, type BrandEngineCheckoutMode } from "@/lib/brand-engine/applications"
import { createBrandEngineCheckoutLink } from "@/lib/brand-engine/offer-checkout"
import { sendEmail } from "@/lib/email/send-email"

function sanitizeName(name: string | null | undefined) {
  return String(name || "").trim() || "there"
}

function toTextCheckoutMode(checkoutMode: Exclude<BrandEngineCheckoutMode, "none">) {
  return checkoutMode === "embedded_checkout" ? "embedded checkout" : "payment link"
}

function buildOfferEmail(params: { name: string; checkoutUrl: string; checkoutMode: Exclude<BrandEngineCheckoutMode, "none"> }) {
  const firstName = sanitizeName(params.name).split(" ")[0] || "there"
  const modeLabel = toTextCheckoutMode(params.checkoutMode)

  const subject = "Your Brand Engine offer is ready"
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #1c1917; line-height: 1.5;">
      <p>Hi ${firstName},</p>
      <p>Your Brand Engine offer is ready. Use the secure ${modeLabel} link below:</p>
      <p>
        <a href="${params.checkoutUrl}" style="display:inline-block;padding:12px 20px;background:#1c1917;color:#fafaf9;text-decoration:none;border-radius:6px;">
          Complete payment
        </a>
      </p>
      <p>If the button doesn't work, copy this URL:</p>
      <p style="word-break: break-all;">${params.checkoutUrl}</p>
      <p>Once payment is complete, you'll receive your onboarding steps.</p>
      <p>— Sandra</p>
    </div>
  `
  const text = [
    `Hi ${firstName},`,
    "",
    `Your Brand Engine offer is ready. Use this secure ${modeLabel} link:`,
    params.checkoutUrl,
    "",
    "Once payment is complete, you'll receive your onboarding steps.",
    "",
    "— Sandra",
  ].join("\n")

  return { subject, html, text }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || "Unauthorized" },
        { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
      )
    }

    const payload = await req.json()
    const applicationId = Number.parseInt(String(payload?.applicationId || ""), 10)
    if (!Number.isFinite(applicationId) || applicationId <= 0) {
      return NextResponse.json({ success: false, error: "Valid applicationId is required." }, { status: 400 })
    }

    const sql = getDb()
    await ensureBrandEngineApplicationsSchema(sql)

    const rows = await sql`
      SELECT
        id,
        name,
        email,
        offer_type,
        checkout_mode,
        pipeline_stage
      FROM brand_engine_applications
      WHERE id = ${applicationId}
      LIMIT 1
    `

    const app = (rows as any[])[0]
    if (!app) {
      return NextResponse.json({ success: false, error: "Application not found." }, { status: 404 })
    }

    const checkout = await createBrandEngineCheckoutLink({
      applicationId,
      name: String(app.name || ""),
      email: String(app.email || ""),
      offerType: app.offer_type,
      checkoutMode: (app.checkout_mode || "payment_link") as BrandEngineCheckoutMode,
    })

    const noteLine = `[offer_sent ${new Date().toISOString()}] checkout_mode=${checkout.checkoutMode}; session_id=${checkout.sessionId}; checkout_url=${checkout.checkoutUrl}`

    const updated = await sql`
      UPDATE brand_engine_applications
      SET
        pipeline_stage = 'offer_sent',
        status = 'offer_sent',
        next_action = 'follow_up',
        call_required = FALSE,
        offer_sent_at = COALESCE(offer_sent_at, NOW()),
        checkout_mode = ${checkout.checkoutMode},
        checkout_mode_reason = ${checkout.checkoutModeReason},
        notes = CASE
          WHEN notes IS NULL OR notes = '' THEN ${noteLine}
          ELSE notes || E'\n' || ${noteLine}
        END,
        updated_at = NOW()
      WHERE id = ${applicationId}
      RETURNING id, pipeline_stage, offer_sent_at, checkout_mode
    `

    const emailPayload = buildOfferEmail({
      name: String(app.name || ""),
      checkoutUrl: checkout.checkoutUrl,
      checkoutMode: checkout.checkoutMode,
    })
    const emailResult = await sendEmail({
      to: String(app.email),
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
      emailType: "brand_engine_offer",
      tags: ["brand-engine", "offer", checkout.checkoutMode],
    })

    return NextResponse.json({
      success: true,
      application: (updated as any[])[0] || null,
      checkoutUrl: checkout.checkoutUrl,
      checkoutMode: checkout.checkoutMode,
      checkoutModeReason: checkout.checkoutModeReason,
      stripeSessionId: checkout.sessionId,
      emailSent: emailResult.success,
      emailError: emailResult.success ? null : emailResult.error,
    })
  } catch (error) {
    console.error("[Brand Engine Send Offer] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 },
    )
  }
}
