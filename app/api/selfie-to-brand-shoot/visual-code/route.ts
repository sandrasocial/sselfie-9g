import { NextResponse } from "next/server"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"
import { mergeMayaMemoryData } from "@/lib/maya/memory-store"
import {
  hasUsefulVisualCode,
  normalizeSelfieToBrandShootVisualCode,
  SELFIE_TO_BRAND_SHOOT_VISUAL_CODE_MEMORY_KEY,
  type SelfieToBrandShootVisualCode,
} from "@/lib/selfie-to-brand-shoot/visual-code"

export const runtime = "nodejs"

async function userCanUseSelfieToBrandShoot(userId: string, email?: string | null) {
  const entitlementState = await getAcademyEntitlementState(userId)
  if (
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("selfie_to_brand_shoot_system")
  ) {
    return true
  }

  if (!email) return false

  const subscriberRows = await sql`
    SELECT 1
    FROM freebie_subscribers
    WHERE LOWER(email) = LOWER(${email})
      AND (
        source = 'selfie-to-brand-shoot-paid'
        OR 'selfie-to-brand-shoot-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        OR 'bought_selfie_to_brand_shoot_system' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        OR 'prompt-vault-admin-access' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
      )
    LIMIT 1
  `

  return subscriberRows.length > 0
}

async function requireSelfieToBrandShootMemoryUser() {
  const user = await requireAcademyUser()
  const hasAccess = await userCanUseSelfieToBrandShoot(user.neonUser.id, user.neonUser.email)

  if (!hasAccess) {
    return {
      user,
      response: NextResponse.json(
        {
          error: "Selfie to Brand Shoot access required",
          hasAccess: false,
        },
        { status: 403 }
      ),
    }
  }

  return { user, response: null }
}

export async function GET() {
  try {
    const { user, response } = await requireSelfieToBrandShootMemoryUser()
    if (response) return response

    const rows = await sql`
      SELECT memory_data->${SELFIE_TO_BRAND_SHOOT_VISUAL_CODE_MEMORY_KEY} AS visual_code
      FROM maya_personal_memory
      WHERE user_id = ${user.neonUser.id}
      LIMIT 1
    `

    const firstRow = rows[0] as { visual_code?: Partial<SelfieToBrandShootVisualCode> } | undefined

    return NextResponse.json({
      visualCode: normalizeSelfieToBrandShootVisualCode(firstRow?.visual_code),
    })
  } catch (error) {
    const routeError = academyRouteErrorToResponse(error)
    if (routeError) return routeError

    console.error("[selfie-to-brand-shoot visual-code] GET failed:", error)
    return NextResponse.json({ error: "Unable to load your visual code" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireSelfieToBrandShootMemoryUser()
    if (response) return response

    const body = await request.json().catch(() => null)
    const visualCode = normalizeSelfieToBrandShootVisualCode(body?.visualCode)

    if (!hasUsefulVisualCode(visualCode)) {
      return NextResponse.json(
        { error: "Add at least one visual code field before saving." },
        { status: 400 }
      )
    }

    await mergeMayaMemoryData(user.neonUser.id, {
      [SELFIE_TO_BRAND_SHOOT_VISUAL_CODE_MEMORY_KEY]: visualCode,
      selfie_to_brand_shoot_visual_code_updated_at: new Date().toISOString(),
    })

    logAnalyticsEvent({
      eventName: "selfie_to_brand_shoot_visual_code_saved",
      userId: user.neonUser.id,
      path: "/api/selfie-to-brand-shoot/visual-code",
      properties: {
        product_id: "selfie_to_brand_shoot_system",
        has_signature_world: Boolean(visualCode.signatureVisualWorld),
        has_first_shoot_direction: Boolean(visualCode.firstShootDirection),
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, visualCode })
  } catch (error) {
    const routeError = academyRouteErrorToResponse(error)
    if (routeError) return routeError

    console.error("[selfie-to-brand-shoot visual-code] POST failed:", error)
    return NextResponse.json({ error: "Unable to save your visual code" }, { status: 500 })
  }
}
