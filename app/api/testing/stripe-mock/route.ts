import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { addCredits } from "@/lib/credits"
import { randomUUID } from "crypto"

const sql = neon(process.env.DATABASE_URL!)

const ALLOWED_PRODUCT_TYPES = ["paid_blueprint", "sselfie_studio_membership"] as const

function isTestModeEnabled(req: NextRequest) {
  const hasPlaywrightHeader = req.headers.get("x-playwright-test") === "1"
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.PLAYWRIGHT_TEST === "1" ||
    process.env.NODE_ENV === "test" ||
    process.env.ALLOW_TEST_STRIPE_MOCK === "1" ||
    hasPlaywrightHeader
  )
}

export async function POST(req: NextRequest) {
  try {
    if (!isTestModeEnabled(req)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const productType = body?.productType

    if (!ALLOWED_PRODUCT_TYPES.includes(productType)) {
      return NextResponse.json(
        { error: "Invalid productType", details: ALLOWED_PRODUCT_TYPES },
        { status: 400 },
      )
    }

    if (productType === "paid_blueprint") {
      const [existing] = await sql`
        SELECT id FROM blueprint_subscribers
        WHERE user_id = ${neonUser.id}
        LIMIT 1
      `

      if (existing?.id) {
        await sql`
          UPDATE blueprint_subscribers
          SET
            paid_blueprint_purchased = TRUE,
            paid_blueprint_purchased_at = NOW(),
            updated_at = NOW()
          WHERE id = ${existing.id}
        `
      } else {
        const accessToken = randomUUID()
        await sql`
          INSERT INTO blueprint_subscribers (
            user_id,
            email,
            name,
            access_token,
            paid_blueprint_purchased,
            paid_blueprint_purchased_at,
            created_at,
            updated_at
          )
          VALUES (
            ${neonUser.id},
            ${neonUser.email || null},
            ${neonUser.display_name || neonUser.email?.split("@")[0] || "User"},
            ${accessToken},
            TRUE,
            NOW(),
            NOW(),
            NOW()
          )
        `
      }

      const existingSubscription = await sql`
        SELECT id FROM subscriptions
        WHERE user_id = ${neonUser.id}
          AND product_type = 'paid_blueprint'
          AND status = 'active'
        LIMIT 1
      `
      if (existingSubscription.length === 0) {
        await sql`
          INSERT INTO subscriptions (
            user_id,
            product_type,
            plan,
            status,
            stripe_customer_id,
            created_at,
            updated_at
          )
          VALUES (
            ${neonUser.id},
            'paid_blueprint',
            'paid_blueprint',
            'active',
            ${null},
            NOW(),
            NOW()
          )
        `
      }
    }

    if (productType === "sselfie_studio_membership") {
      const existingSubscription = await sql`
        SELECT id FROM subscriptions
        WHERE user_id = ${neonUser.id}
          AND product_type = 'sselfie_studio_membership'
          AND status = 'active'
        LIMIT 1
      `
      if (existingSubscription.length === 0) {
        await sql`
          INSERT INTO subscriptions (
            user_id,
            product_type,
            plan,
            status,
            stripe_customer_id,
            created_at,
            updated_at
          )
          VALUES (
            ${neonUser.id},
            'sselfie_studio_membership',
            'sselfie_studio_membership',
            'active',
            ${null},
            NOW(),
            NOW()
          )
        `
      }

      await addCredits(
        neonUser.id,
        200,
        "subscription_grant",
        "Test mode membership grant",
        undefined,
        true,
      )
    }

    return NextResponse.json({ success: true, productType })
  } catch (error) {
    console.error("[stripe-mock] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe mock failed" },
      { status: 500 },
    )
  }
}
