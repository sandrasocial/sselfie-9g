import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { checkRateLimit } from "@/lib/rate-limit-api"
import { createAdminClient } from "@/lib/supabase/admin"
import { stripe } from "@/lib/stripe"

const ACCOUNT_SETUP_PRODUCTS = new Set([
  "academy_mini_product",
  "brand_strategy_pack",
  "masterclass",
  "one_time_session",
  "paid_blueprint",
  "presets_bundle",
  "presets_single",
  "prompt_vault",
  "selfie_ai_photos_kit",
  "selfie_guide",
  "selfie_guide_bundle",
  "selfie_to_brand_shoot_system",
  "selfie_visibility_bundle",
  "sselfie_studio_membership",
  "sselfie_studio_membership_annual",
  "starter_kit",
  "transform_starter",
  "transform_topup",
  "visibility_suite",
  "work_with_me",
])

function requestIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""

    if (
      !sessionId.startsWith("cs_") ||
      sessionId.length > 255 ||
      password.length < 8 ||
      password.length > 128 ||
      !name ||
      name.length > 100
    ) {
      return NextResponse.json({ error: "Invalid account setup details" }, { status: 400 })
    }

    const rateLimit = await checkRateLimit(`${requestIp(request)}:${sessionId}`, "ACCOUNT_SETUP")
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, rateLimit.reset - Math.floor(Date.now() / 1000))
      return NextResponse.json(
        { error: "Too many attempts. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      )
    }

    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
    } catch {
      return NextResponse.json({ error: "This checkout could not be verified" }, { status: 403 })
    }

    const productType = session.metadata?.product_type || ""
    if (
      session.status !== "complete" ||
      session.payment_status !== "paid" ||
      !ACCOUNT_SETUP_PRODUCTS.has(productType)
    ) {
      return NextResponse.json({ error: "This paid checkout could not be verified" }, { status: 403 })
    }

    const email = (session.customer_details?.email || session.customer_email || "")
      .trim()
      .toLowerCase()
    if (!email) {
      return NextResponse.json(
        { error: "Account setup is unavailable. Please contact support." },
        { status: 422 },
      )
    }

    const users = await sql`
      SELECT id, supabase_user_id, password_setup_complete
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Your access is still being prepared. Please try again in a moment." },
        { status: 404 },
      )
    }

    const user = users[0]
    if (user.password_setup_complete === true) {
      return NextResponse.json(
        { error: "This account is already set up. Please log in or reset your password." },
        { status: 409 },
      )
    }

    if (!user.supabase_user_id) {
      return NextResponse.json(
        { error: "Account setup is incomplete. Please contact support." },
        { status: 500 },
      )
    }

    const supabaseAdmin = createAdminClient()
    const { data: authData, error: authLookupError } =
      await supabaseAdmin.auth.admin.getUserById(user.supabase_user_id)
    const authUser = authData?.user || null
    const appMetadata =
      authUser?.app_metadata && typeof authUser.app_metadata === "object"
        ? { ...authUser.app_metadata }
        : {}

    // A paid session proves a purchase, not ownership of a pre-existing account.
    // Inline password creation is allowed only for the auth user this exact
    // checkout created. Existing users use login or the emailed recovery flow.
    if (
      authLookupError ||
      !authUser ||
      appMetadata.account_setup_checkout_session_id !== sessionId
    ) {
      return NextResponse.json(
        { error: "This account already exists. Please log in or reset your password." },
        { status: 409 },
      )
    }

    delete appMetadata.account_setup_checkout_session_id
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user.supabase_user_id,
      {
        password,
        email_confirm: true,
        app_metadata: appMetadata,
      },
    )

    if (authError) {
      return NextResponse.json({ error: "Failed to set password" }, { status: 500 })
    }

    await sql`
      UPDATE users
      SET
        display_name = ${name},
        password_setup_complete = TRUE,
        updated_at = NOW()
      WHERE id = ${user.id}
    `

    return NextResponse.json({
      success: true,
      message: "Account completed successfully",
    })
  } catch (error) {
    console.error("[complete-account] Account setup failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
