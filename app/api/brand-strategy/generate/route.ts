import { type NextRequest, NextResponse } from "next/server"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { sql } from "@/lib/db/client"
import { generateBrandStrategyPaidDeliveryEmail } from "@/lib/email/templates/brand-strategy-paid-delivery"
import { sendEmail } from "@/lib/email/send-email"
import { generateFreebieStrategy } from "@/lib/freebie/generate-brand-strategy"
import { hasPaidSelfieToBrandShootAccess } from "@/lib/freebie/selfie-to-brand-shoot-access"
import { addOrUpdateResendContact } from "@/lib/resend/manage-contact"
import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"

export const maxDuration = 90

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"

interface GenerateRequestBody {
  setupToken?: string
  name?: string
  businessType?: string
  targetAudience?: string
  transformationStory?: string
  brandVibe?: string
}

async function resolveAuthenticatedBrandStrategyContext() {
  const { authUser, neonUser } = await requireAcademyUser()
  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  // Brand Strategy is bundled into Selfie to Brand Shoot (Step 0). Accept either the
  // entitlement OR paid SBS access, so buyers without a userId-linked entitlement row
  // (e.g. checkout before account creation) can still complete it.
  const hasAccess =
    entitlementState.accessibleProductIds.includes("brand_strategy_pack") ||
    (await hasPaidSelfieToBrandShootAccess(authUser.email || neonUser.email))

  if (!hasAccess) {
    return NextResponse.json(
      {
        error: "Brand Strategy access requires entitlement.",
        hasAccess: false,
        requiredProductId: "brand_strategy_pack",
      },
      { status: 403 }
    )
  }

  const email = authUser.email || neonUser.email
  if (!email) {
    return NextResponse.json(
      { error: "Could not retrieve user email. Please contact support at hello@sselfie.ai." },
      { status: 422 }
    )
  }

  return {
    userId: neonUser.id,
    email,
    displayName: null,
  }
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

    if (!name || !businessType || !targetAudience) {
      return NextResponse.json(
        { error: "Missing required fields: name, businessType, targetAudience" },
        { status: 400 }
      )
    }

    let accessContext:
      | {
          userId: string
          email: string
          displayName: string | null
        }
      | Response

    if (setupToken) {
      const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
      const rows = await sql`
        SELECT s.id AS subscription_id, s.user_id, u.email, u.display_name
        FROM subscriptions s
        LEFT JOIN users u ON u.id::text = s.user_id
        WHERE s.setup_token = ${setupToken}::uuid
          AND s.product_type = 'brand_strategy_pack'
          AND s.status = 'active'
          AND (${enforceLiveMode} = false OR COALESCE(s.is_test_mode, false) = false)
        LIMIT 1
      `

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: "Invalid or expired setup token." }, { status: 404 })
      }

      const row = rows[0]
      if (!row.email) {
        return NextResponse.json(
          { error: "Could not retrieve buyer email. Please contact support at hello@sselfie.ai." },
          { status: 422 }
        )
      }

      accessContext = {
        userId: String(row.user_id),
        email: row.email,
        displayName: row.display_name || null,
      }
    } else {
      accessContext = await resolveAuthenticatedBrandStrategyContext()
    }

    if (accessContext instanceof Response) {
      return accessContext
    }

    const existing = await sql`
      SELECT access_token
      FROM freebie_brand_strategies
      WHERE email = LOWER(${accessContext.email})
        AND (${setupToken || null}::uuid IS NULL OR setup_token = ${setupToken || null}::uuid)
      ORDER BY created_at DESC
      LIMIT 1
    `.catch(() => [] as any[])

    if (existing && existing.length > 0) {
      return NextResponse.json({ accessToken: existing[0].access_token, hasAccess: true })
    }

    const strategy = await generateFreebieStrategy({
      name,
      business_type: businessType,
      target_audience: targetAudience,
      transformation_story: transformationStory,
      brand_vibe: brandVibe,
    })

    const accessToken = crypto.randomUUID()
    const firstName = name.split(" ")[0] || name

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
        ${accessContext.email.toLowerCase()},
        ${name},
        ${businessType},
        ${targetAudience},
        ${transformationStory ?? null},
        ${brandVibe},
        ${JSON.stringify(strategy)}::jsonb,
        ${setupToken || null}
      )
      ON CONFLICT (access_token) DO NOTHING
    `

    try {
      await addOrUpdateResendContact(accessContext.email, firstName, {
        source: setupToken ? "brand-strategy-paid" : "brand-strategy-member",
        status: "customer",
        product: "brand-strategy",
        journey: setupToken ? "paid" : "academy",
        signup_date: new Date().toISOString().split("T")[0],
      })
    } catch {
      // best effort
    }

    const strategyUrl = `${SITE_URL}/strategy/${accessToken}`
    try {
      const emailContent = generateBrandStrategyPaidDeliveryEmail({
        firstName,
        recipientEmail: accessContext.email,
        strategyUrl,
      })
      await sendEmail({
        from: "Maya at SSELFIE <hello@sselfie.ai>",
        to: accessContext.email,
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

    return NextResponse.json({ accessToken, url: strategyUrl, hasAccess: true })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[brand-strategy/generate] POST error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate strategy",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
