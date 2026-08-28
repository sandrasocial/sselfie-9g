import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserSubscription } from "@/lib/subscription"
import { getStripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { NextResponse, type NextRequest } from "next/server"
import {
  analyticsGenerationFromRequest,
  rotateAnonymousAnalyticsIdentity,
} from "@/lib/analytics/identity-cookies"
import { clearSupabaseSessionCookies } from "@/lib/supabase/session-cookies"

function tolerateMissingLegacyTable(error: unknown): void {
  if ((error as { code?: string } | null)?.code === "42P01") return
  throw error
}

/**
 * DELETE /api/user/delete
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * Order of operations:
 *   1. Authenticate
 *   2. Cancel active Stripe subscription (if any)
 *   3. Delete all Neon data (leaf tables first to respect FK constraints)
 *   4. Delete Supabase auth user (must be last; its JWT can remain valid until expiry)
 *   5. Rotate the server-owned analytics identity before returning success
 */
export async function DELETE(req?: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userId = neonUser.id
    const subscription = await getUserSubscription(userId)
    const stripeSubscriptionId = subscription?.stripe_subscription_id ?? null

    // 2. Cancel Stripe subscription if active
    if (stripeSubscriptionId) {
      try {
        const stripe = getStripe()
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        if (sub.status !== "canceled") {
          await stripe.subscriptions.cancel(stripeSubscriptionId)
          console.log(`[delete-account] Cancelled Stripe subscription ${stripeSubscriptionId}`)
        }
      } catch (stripeErr) {
        // Log but don't block deletion - subscription may already be gone
        console.warn("[delete-account] Stripe cancellation warning:", stripeErr)
      }
    }

    // 3. Delete all Neon data (child/leaf tables first)
    console.log(`[delete-account] Deleting Neon data for user ${userId}`)

    // Chat messages (FK → maya_chats)
    await sql`DELETE FROM maya_chat_messages WHERE chat_id IN (SELECT id FROM maya_chats WHERE user_id = ${userId})`
    // Chat sessions
    await sql`DELETE FROM maya_chats WHERE user_id = ${userId}`
    // Cross-session memory
    await sql`DELETE FROM maya_personal_memory WHERE user_id = ${userId}`

    // Selfie uploads (FK → training_runs)
    await sql`DELETE FROM selfie_uploads WHERE user_id = ${userId}`
    // User models (FK → training_runs)
    await sql`DELETE FROM user_models WHERE user_id = ${userId}`
    // Training runs
    await sql`DELETE FROM training_runs WHERE user_id = ${userId}`

    // Gallery images
    await sql`DELETE FROM ai_images WHERE user_id = ${userId}`
    await sql`DELETE FROM generated_images WHERE user_id = ${userId}`
    await sql`DELETE FROM user_avatar_images WHERE user_id = ${userId}`

    // Brand / profile data
    await sql`DELETE FROM brand_assets WHERE user_id = ${userId}`
    await sql`DELETE FROM user_personal_brand WHERE user_id = ${userId}`
    await sql`DELETE FROM user_style_guide WHERE user_id = ${userId}`.catch(
      tolerateMissingLegacyTable
    )
    await sql`DELETE FROM user_profiles WHERE user_id = ${userId}`

    // Feed planner data
    await sql`DELETE FROM feed_posts WHERE feed_id IN (SELECT id FROM feeds WHERE user_id = ${userId})`.catch(
      tolerateMissingLegacyTable
    )
    await sql`DELETE FROM feeds WHERE user_id = ${userId}`.catch(tolerateMissingLegacyTable)
    await sql`DELETE FROM feed_strategies WHERE user_id = ${userId}`.catch(
      tolerateMissingLegacyTable
    )

    // Credit transactions
    await sql`DELETE FROM credit_transactions WHERE user_id = ${userId}`.catch(
      tolerateMissingLegacyTable
    )

    // Subscriptions row
    await sql`DELETE FROM subscriptions WHERE user_id = ${userId}`.catch(tolerateMissingLegacyTable)

    // Agent profiles / brand strategy
    await sql`DELETE FROM agent_profiles WHERE user_id = ${userId}`.catch(
      tolerateMissingLegacyTable
    )
    await sql`DELETE FROM freebie_brand_strategies WHERE email = ${neonUser.email}`

    // Settings
    await sql`DELETE FROM user_settings WHERE user_id = ${userId}`.catch(tolerateMissingLegacyTable)

    // Core user row (must be last among Neon tables)
    await sql`DELETE FROM users WHERE id = ${userId}`

    console.log(`[delete-account] All Neon data deleted for user ${userId}`)

    // 4. Delete Supabase auth user (last - invalidates the session)
    const adminClient = createAdminClient()
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(authUser.id)
    if (authDeleteError) {
      console.error("[delete-account] Supabase auth deletion failed:", authDeleteError)
      // Data is already gone from Neon - return success anyway so client can redirect
    }

    console.log(`[delete-account] Account fully deleted for auth user ${authUser.id}`)
    const response = NextResponse.json({ success: true })
    // The account no longer has a Neon identity. Clear any locally persisted
    // Supabase session even if provider-side auth deletion failed, then rotate
    // analytics before the browser can bootstrap against the stale auth user.
    clearSupabaseSessionCookies(response, req)
    rotateAnonymousAnalyticsIdentity(response, analyticsGenerationFromRequest(req), req)
    return response
  } catch (error) {
    console.error("[delete-account] Unexpected error:", error)
    return NextResponse.json(
      { error: "Failed to delete account. Please contact support." },
      { status: 500 }
    )
  }
}
