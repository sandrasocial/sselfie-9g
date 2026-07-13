import { NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { stripe } from "@/lib/stripe"

type UserStatusRow = {
  id: string
  email: string
  supabase_user_id: string | null
  password_setup_complete: boolean | null
}

type BundleReadyRow = {
  bundle_ready: boolean
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")?.trim()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.status !== "complete") {
      return NextResponse.json({ userInfo: null }, { status: 202 })
    }

    const email = (session.customer_details?.email || session.customer_email || "").trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ userInfo: null }, { status: 202 })
    }

    const rows = (await sql`
      SELECT id, email, supabase_user_id, password_setup_complete
      FROM users
      WHERE LOWER(email) = ${email}
      LIMIT 1
    `) as UserStatusRow[]

    const user = rows[0]
    if (!user) {
      return NextResponse.json({ userInfo: null }, { status: 202 })
    }

    const productType = session.metadata?.product_type?.trim() || ""
    if (productType === "selfie_visibility_bundle") {
      // The owner row is created before the lifetime tools and the fixed SUITE pass.
      // Release the buyer-home action only after the final pass marker exists so a
      // fast Stripe redirect can never beat webhook fulfillment.
      const bundleRows = (await sql`
        SELECT (
          EXISTS (
            SELECT 1
            FROM subscriptions
            WHERE user_id = ${user.id}
              AND product_type = 'selfie_visibility_bundle'
              AND status = 'active'
              AND COALESCE(is_test_mode, FALSE) = FALSE
          )
          AND EXISTS (
            SELECT 1
            FROM subscriptions
            WHERE user_id = ${user.id}
              AND product_type = 'selfie_visibility_bundle_pass'
              AND COALESCE(is_test_mode, FALSE) = FALSE
          )
        ) AS bundle_ready
      `) as BundleReadyRow[]

      if (!bundleRows[0]?.bundle_ready) {
        return NextResponse.json({ userInfo: null }, { status: 202 })
      }
    }

    if (user.password_setup_complete === true) {
      return NextResponse.json({
        userInfo: {
          email: user.email || email,
          hasAccount: true,
        },
      })
    }

    // The webhook provisions or repairs Auth before the success page can offer
    // inline password creation. Keep polling while that mapping is incomplete.
    if (!user.supabase_user_id) {
      return NextResponse.json({ userInfo: null }, { status: 202 })
    }

    const supabaseAdmin = createAdminClient()
    const { data: authData, error: authLookupError } =
      await supabaseAdmin.auth.admin.getUserById(user.supabase_user_id)
    const authUser = authData?.user || null

    if (authLookupError || !authUser) {
      return NextResponse.json({ userInfo: null }, { status: 202 })
    }

    const appMetadata =
      authUser.app_metadata && typeof authUser.app_metadata === "object"
        ? authUser.app_metadata
        : {}
    const canCreatePasswordInline =
      !authUser.last_sign_in_at &&
      appMetadata.account_setup_checkout_session_id === sessionId

    return NextResponse.json({
      userInfo: {
        email: user.email || email,
        // Existing Auth users receive an emailed recovery link. Treat them as
        // account holders so the success page never shows an impossible form.
        hasAccount: !canCreatePasswordInline,
      },
    })
  } catch (error) {
    console.error("[checkout-user-status] Failed to resolve checkout user status:", error)
    return NextResponse.json({ error: "Unable to resolve checkout status" }, { status: 500 })
  }
}
