import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/neon"
import { addOrUpdateResendContact } from "@/lib/resend/manage-contact"
import { sendEmail } from "@/lib/email/send-email"
import { generateStrategyEmail } from "@/lib/email/templates/freebie-strategy-email"
import { generateFreebieStrategy } from "@/lib/freebie/generate-brand-strategy"

export const maxDuration = 90

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"

let ensureTablePromise: Promise<void> | null = null

async function ensureFreebieBrandStrategiesTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS freebie_brand_strategies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          access_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
          email TEXT NOT NULL,
          name TEXT NOT NULL,
          business_type TEXT NOT NULL,
          target_audience TEXT NOT NULL,
          transformation_story TEXT,
          brand_vibe TEXT NOT NULL DEFAULT 'warm',
          strategy_json JSONB,
          resend_contact_id TEXT,
          email_sent BOOLEAN NOT NULL DEFAULT false,
          email_sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `

      await sql`CREATE INDEX IF NOT EXISTS idx_fbs_email ON freebie_brand_strategies(email)`
      await sql`CREATE INDEX IF NOT EXISTS idx_fbs_token ON freebie_brand_strategies(access_token)`
    })().catch((error) => {
      ensureTablePromise = null
      throw error
    })
  }

  await ensureTablePromise
}

interface FreebieRequestBody {
  email?: string
  name?: string
  business_type?: string
  target_audience?: string
  transformation_story?: string
  brand_vibe?: string
}

function normalizeBodyValue(value: string | undefined): string {
  return (value || "").trim()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest) {
  try {
    await ensureFreebieBrandStrategiesTable()

    const body = (await request.json().catch(() => ({}))) as FreebieRequestBody

    const email = normalizeBodyValue(body.email).toLowerCase()
    const name = normalizeBodyValue(body.name)
    const business_type = normalizeBodyValue(body.business_type)
    const target_audience = normalizeBodyValue(body.target_audience)
    const transformation_story = normalizeBodyValue(body.transformation_story) || null
    const brand_vibe = normalizeBodyValue(body.brand_vibe)

    if (!email || !name || !business_type || !target_audience || !brand_vibe) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, business_type, target_audience, brand_vibe" },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    const existing = await sql`
      SELECT access_token
      FROM freebie_brand_strategies
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `

    if (existing.length > 0) {
      const token = existing[0].access_token
      return NextResponse.json({
        success: true,
        accessToken: token,
        url: `${SITE_URL}/strategy/${token}`,
        alreadyExists: true,
      })
    }

    const accessToken = crypto.randomUUID()

    await sql`
      INSERT INTO freebie_brand_strategies (
        access_token,
        email,
        name,
        business_type,
        target_audience,
        transformation_story,
        brand_vibe
      ) VALUES (
        ${accessToken},
        ${email},
        ${name},
        ${business_type},
        ${target_audience},
        ${transformation_story},
        ${brand_vibe}
      )
    `

    const strategy = await generateFreebieStrategy({
      name,
      business_type,
      target_audience,
      transformation_story: transformation_story || undefined,
      brand_vibe,
    })

    await sql`
      UPDATE freebie_brand_strategies
      SET strategy_json = ${JSON.stringify(strategy)}::jsonb,
          updated_at = NOW()
      WHERE access_token = ${accessToken}
    `

    const firstName = name.split(" ")[0] || name
    const resendResult = await addOrUpdateResendContact(email, firstName, {
      source: "freebie-strategy",
      status: "lead",
      product: "brand-strategy",
      journey: "nurture",
      signup_date: new Date().toISOString().split("T")[0],
    })

    if (resendResult.success && resendResult.contactId) {
      await sql`
        UPDATE freebie_brand_strategies
        SET resend_contact_id = ${resendResult.contactId},
            updated_at = NOW()
        WHERE access_token = ${accessToken}
      `
    }

    const strategyUrl = `${SITE_URL}/strategy/${accessToken}`

    try {
      const emailContent = generateStrategyEmail({
        firstName,
        email,
        strategyUrl,
      })

      const emailResult = await sendEmail({
        from: "Maya at SSELFIE <hello@sselfie.ai>",
        to: email,
        replyTo: "hello@sselfie.ai",
        subject: `${firstName}, your brand strategy is ready ✨`,
        html: emailContent.html,
        text: emailContent.text,
        tags: ["freebie-strategy"],
        emailType: "freebie_strategy",
      })

      if (emailResult.success) {
        await sql`
          UPDATE freebie_brand_strategies
          SET email_sent = true,
              email_sent_at = NOW(),
              updated_at = NOW()
          WHERE access_token = ${accessToken}
        `
      }
    } catch (emailError) {
      console.error("[freebie-strategy] Email send failed:", emailError)
    }

    return NextResponse.json({
      success: true,
      accessToken,
      url: strategyUrl,
    })
  } catch (error) {
    console.error("[freebie-strategy] POST error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate strategy",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
