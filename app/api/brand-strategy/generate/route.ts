import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { generateFreebieStrategy } from "@/lib/freebie/generate-brand-strategy"
import { addOrUpdateResendContact } from "@/lib/resend/manage-contact"
import { sendEmail } from "@/lib/email/send-email"
import { generateBrandStrategyPaidDeliveryEmail } from "@/lib/email/templates/brand-strategy-paid-delivery"

export const maxDuration = 90

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"

interface GenerateRequestBody {
  setupToken?: string
  name?: string
  businessType?: string
  targetAudience?: string
  transformationStory?: string
  brandVibe?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as GenerateRequestBody

    const setupToken = (body.setupToken || "").trim()
    const name = (body.name || "").trim()
    const businessType = (body.businessType || "").trim()
    const targetAudience = (body.targetAudience || "").trim()
    const transformationStory = (body.transformationStory || "").trim() || undefined
    const brandVibe = (body.brandVibe || "warm").trim()

    if (!setupToken || !name || !businessType || !targetAudience) {
      return NextResponse.json(
        { error: "Missing required fields: setupToken, name, businessType, targetAudience" },
        { status: 400 },
      )
    }

    // Validate setup token and get buyer details
    const rows = await sql`
      SELECT s.id as subscription_id, s.user_id, u.email, u.display_name
      FROM subscriptions s
      LEFT JOIN users u ON u.id::text = s.user_id
      WHERE s.setup_token = ${setupToken}::uuid
        AND s.product_type = 'brand_strategy_pack'
        AND s.status = 'active'
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired setup token." },
        { status: 404 },
      )
    }

    const { user_id: userId, email } = rows[0]

    if (!email) {
      return NextResponse.json(
        { error: "Could not retrieve buyer email. Please contact support at hello@sselfie.ai." },
        { status: 422 },
      )
    }

    // Check if strategy already generated for this setup token (idempotency)
    const existing = await sql`
      SELECT access_token
      FROM freebie_brand_strategies
      WHERE email = LOWER(${email})
        AND setup_token = ${setupToken}
      LIMIT 1
    `.catch(() => [] as any[])

    if (existing && existing.length > 0) {
      return NextResponse.json({ accessToken: existing[0].access_token })
    }

    // Generate the strategy
    const strategy = await generateFreebieStrategy({
      name,
      business_type: businessType,
      target_audience: targetAudience,
      transformation_story: transformationStory,
      brand_vibe: brandVibe,
    })

    const accessToken = crypto.randomUUID()
    const firstName = name.split(" ")[0] || name

    // Insert into freebie_brand_strategies (reuse existing table + result page)
    await sql`
      INSERT INTO freebie_brand_strategies (
        access_token,
        email,
        name,
        business_type,
        target_audience,
        transformation_story,
        brand_vibe,
        strategy_json,
        setup_token
      ) VALUES (
        ${accessToken},
        ${email.toLowerCase()},
        ${name},
        ${businessType},
        ${targetAudience},
        ${transformationStory ?? null},
        ${brandVibe},
        ${JSON.stringify(strategy)}::jsonb,
        ${setupToken}
      )
      ON CONFLICT (access_token) DO NOTHING
    `

    // Tag in Resend
    try {
      await addOrUpdateResendContact(email, firstName, {
        source: "brand-strategy-paid",
        status: "customer",
        product: "brand-strategy",
        journey: "paid",
        signup_date: new Date().toISOString().split("T")[0],
      })
    } catch {
      // best effort — don't fail the request over Resend
    }

    // Send delivery email
    const strategyUrl = `${SITE_URL}/strategy/${accessToken}`
    try {
      const emailContent = generateBrandStrategyPaidDeliveryEmail({
        firstName,
        recipientEmail: email,
        strategyUrl,
      })
      await sendEmail({
        from: "Maya at SSELFIE <hello@sselfie.ai>",
        to: email,
        replyTo: "hello@sselfie.ai",
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        tags: ["brand-strategy-paid-delivery"],
        emailType: "brand-strategy-paid-delivery",
      })
    } catch (emailErr) {
      console.error("[brand-strategy/generate] Delivery email failed:", emailErr)
    }

    return NextResponse.json({ accessToken, url: strategyUrl })
  } catch (error) {
    console.error("[brand-strategy/generate] POST error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate strategy",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
