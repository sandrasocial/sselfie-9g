import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"
import { normalizeReferralCode } from "@/lib/referrals/routing"
import { isReferralSignupEligible, trackReferralSignup } from "@/lib/referrals/service"
import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"
import { syncUserWithNeon } from "@/lib/user-sync"
import { NextResponse } from "next/server"
import {
  LIVE_MEMBER_APP_PATH,
  normalizeLegacyStudioRedirect,
  sanitizeRedirect,
} from "@/lib/security/url-validator"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin
  const safeNext = normalizeLegacyStudioRedirect(
    sanitizeRedirect(requestUrl.searchParams.get("next"), LIVE_MEMBER_APP_PATH)
  )

  const redirectToRecovery = (message: string) => {
    const errorUrl = new URL("/auth/error", origin)
    errorUrl.searchParams.set("error", message)
    errorUrl.searchParams.set("next", safeNext)
    return NextResponse.redirect(errorUrl)
  }

  console.log("[v0] ===== AUTH CALLBACK ROUTE HIT =====")
  console.log("[v0] Full URL:", requestUrl.toString())
  console.log("[v0] All query params:", Object.fromEntries(requestUrl.searchParams))
  console.log("[v0] Code present:", !!code)
  console.log("[v0] Origin:", origin)

  if (code) {
    const supabase = await createClient()
    console.log("[v0] Attempting to exchange code for session...")

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      console.log("[v0] ✅ Session established for user:", data.user.email)
      console.log("[v0] User metadata:", data.user.user_metadata)
      console.log("[v0] Recovery sent at:", data.user.recovery_sent_at)

      const isPasswordRecovery =
        data.user.recovery_sent_at !== null || requestUrl.searchParams.get("type") === "recovery"

      if (isPasswordRecovery) {
        console.log("[v0] 🔐 Password recovery detected, redirecting to setup-password")
        const nextSuffix = `?next=${encodeURIComponent(safeNext)}`
        return NextResponse.redirect(`${origin}/auth/setup-password${nextSuffix}`)
      }

      console.log("[v0] 👤 Regular auth, syncing user with Neon")
      const neonUser = await syncUserWithNeon(data.user.id, data.user.email!, data.user.user_metadata?.name)

      // Decision 1: Grant free user credits to ALL free users who haven't received them yet
      // This ensures credits are granted for all signups via callback route
      if (neonUser?.id) {
        try {
          
          // Check if user has active subscription (only free users get welcome credits)
          const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
          const hasSubscription = await sql`
            SELECT COUNT(*) as count
            FROM subscriptions
            WHERE user_id = ${neonUser.id} AND status = 'active'
              AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
          `
          
          if (hasSubscription[0].count === 0) {
            // Check if welcome bonus transaction already exists (prevent duplicates)
            const existingTransaction = await sql`
              SELECT id FROM credit_transactions 
              WHERE user_id = ${neonUser.id} 
              AND transaction_type = 'bonus' 
              AND description = 'Free blueprint credits (welcome bonus)'
              LIMIT 1
            `
            
            if (existingTransaction.length === 0) {
              // Grant 2 credits to all free users who haven't received welcome bonus yet
              const { grantFreeUserCredits } = await import("@/lib/credits")
              const creditResult = await grantFreeUserCredits(neonUser.id)
              
              if (creditResult.success) {
                console.log(`[v0] ✅ Free user credits (2) granted to user ${neonUser.id} via callback`)
              } else {
                console.error(`[v0] ❌ Failed to grant free user credits: ${creditResult.error}`)
              }
            } else {
              console.log(`[v0] ⏭️ User ${neonUser.id} already received welcome bonus - skipping`)
            }
          } else {
            console.log(`[v0] ⏭️ User ${neonUser.id} has active subscription - skipping free credits`)
          }
        } catch (creditError) {
          console.error(`[v0] ❌ Error granting free user credits (non-critical):`, creditError)
          // Don't fail auth if credit grant fails
        }
      }

      // Update last login timestamp for retention tracking
      if (neonUser?.id) {
        try {
          await sql`
            UPDATE users 
            SET last_login_at = NOW() 
            WHERE id = ${neonUser.id}
          `
          console.log(`[v0] ✅ Updated last_login_at for user ${neonUser.id}`)
        } catch (loginUpdateError) {
          console.error(`[v0] ⚠️ Failed to update last_login_at:`, loginUpdateError)
          // Don't fail auth if login tracking fails
        }
      }

      // Grant reactivation bonus credits if user signed up via coldreactivation campaign
      const utmSource = requestUrl.searchParams.get("utm_source")
      if (utmSource === "coldreactivation" && neonUser?.id) {
        try {
          
          // Check if this is a new user (created in last 5 minutes) to avoid granting on every login
          const userCreated = await sql`
            SELECT created_at FROM users WHERE id = ${neonUser.id} LIMIT 1
          `
          
          if (userCreated.length > 0) {
            const createdAt = new Date(userCreated[0].created_at)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
            
            // Only grant if user was just created (within last 5 minutes)
            if (createdAt > fiveMinutesAgo) {
              const { addCredits } = await import("@/lib/credits")
              const creditResult = await addCredits(
                neonUser.id,
                25,
                "bonus",
                "Reactivation signup bonus (Day 14 campaign)",
              )
              
              if (creditResult.success) {
                console.log(`[v0] ✅ Reactivation bonus credits (25) granted to user ${neonUser.id}`)
              } else {
                console.error(`[v0] ⚠️ Failed to grant reactivation bonus credits: ${creditResult.error}`)
              }
            }
          }
        } catch (reactivationError) {
          console.error(`[v0] ⚠️ Error granting reactivation bonus credits (non-critical):`, reactivationError)
          // Don't fail auth if credit grant fails
        }
      }

      // Track referral if referral code is present in the callback URL.
      const referralCode = normalizeReferralCode(requestUrl.searchParams.get("ref"))
      if (referralCode && neonUser?.id) {
        try {
          if (isReferralSignupEligible(neonUser.created_at)) {
            const result = await trackReferralSignup({
              referralCode,
              referredUserId: neonUser.id,
            })

            if (result.success) {
              console.log(`[v0] ✅ Referral tracked for new user ${neonUser.id} with code ${referralCode}`)
            } else {
              console.log(`[v0] ⚠️ Failed to track referral (non-critical):`, result.status)
            }
          }
        } catch (referralError) {
          console.error(`[v0] ⚠️ Error tracking referral (non-critical):`, referralError)
          // Don't fail auth if referral tracking fails
        }
      }

      // Let the studio page handle access control based on credits
      return NextResponse.redirect(`${origin}/studio`)
    } else {
      console.error("[v0] ❌ Error exchanging code:", error)
      return redirectToRecovery(error?.message || "Authentication failed")
    }
  }

  const callbackError =
    requestUrl.searchParams.get("error_description") ||
    requestUrl.searchParams.get("error") ||
    "This sign-in link is invalid or has expired."
  console.log("[v0] ⚠️ No code provided in callback, redirecting to recovery")
  return redirectToRecovery(callbackError)
}
