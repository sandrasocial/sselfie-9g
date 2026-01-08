import { createClient } from "@/lib/supabase/server"
import { syncUserWithNeon } from "@/lib/user-sync"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

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
        return NextResponse.redirect(`${origin}/auth/setup-password`)
      }

      console.log("[v0] 👤 Regular auth, syncing user with Neon")
      const neonUser = await syncUserWithNeon(data.user.id, data.user.email!, data.user.user_metadata?.name)

      // Update last login timestamp for retention tracking
      if (neonUser?.id) {
        try {
          const { neon } = await import("@neondatabase/serverless")
          const sql = neon(process.env.DATABASE_URL!)
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
          const { neon } = await import("@neondatabase/serverless")
          const sql = neon(process.env.DATABASE_URL!)
          
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

      // Track referral if referral code is present in URL or stored in session
      const referralCode = requestUrl.searchParams.get("ref")
      if (referralCode && neonUser?.id) {
        try {
          const { neon } = await import("@neondatabase/serverless")
          const sql = neon(process.env.DATABASE_URL!)
          
          // Check if this is a new user (created in last 5 minutes) to avoid tracking on every login
          const userCreated = await sql`
            SELECT created_at FROM users WHERE id = ${neonUser.id} LIMIT 1
          `
          
          if (userCreated.length > 0) {
            const createdAt = new Date(userCreated[0].created_at)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
            
            // Only track if user was just created (within last 5 minutes)
            if (createdAt > fiveMinutesAgo) {
              const trackResponse = await fetch(`${origin}/api/referrals/track`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  referralCode,
                  referredUserId: neonUser.id,
                }),
              })
              
              if (trackResponse.ok) {
                console.log(`[v0] ✅ Referral tracked for new user ${neonUser.id} with code ${referralCode}`)
              } else {
                console.log(`[v0] ⚠️ Failed to track referral (non-critical):`, await trackResponse.text())
              }
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
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(error?.message || "Authentication failed")}`,
      )
    }
  }

  console.log("[v0] ⚠️ No code provided in callback, redirecting to home")
  return NextResponse.redirect(`${origin}/`)
}
