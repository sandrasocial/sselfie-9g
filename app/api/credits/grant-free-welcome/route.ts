import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { grantFreeUserCredits } from "@/lib/credits"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/credits/grant-free-welcome
 * 
 * Grants 2 free credits to a newly signed up user.
 * Called from signup page after successful sign-in.
 * 
 * Decision 1: Credit System for All Users
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Credits] ===== GRANT-FREE-WELCOME ENDPOINT CALLED =====")
    const body = await request.json()
    const { userId: authUserId } = body
    console.log("[Credits] Request body:", { authUserId })

    if (!authUserId) {
      console.error("[Credits] ❌ No user ID provided")
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Verify user is authenticated
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("[Credits] ❌ Auth error:", authError.message)
      return NextResponse.json({ error: "Authentication failed", details: authError.message }, { status: 401 })
    }

    if (!user) {
      console.error("[Credits] ❌ No user found in session")
      return NextResponse.json({ error: "Unauthorized - no user session" }, { status: 401 })
    }

    if (user.id !== authUserId) {
      console.error(`[Credits] ❌ User ID mismatch: session=${user.id}, request=${authUserId}`)
      return NextResponse.json({ error: "Unauthorized - user ID mismatch" }, { status: 401 })
    }

    console.log(`[Credits] ✅ Authenticated user: ${user.email} (${user.id})`)

    // Get or create Neon user (create if doesn't exist yet)
    // This ensures user exists before granting credits
    let neonUser = await getUserByAuthId(authUserId)
    console.log(`[Credits] Neon user lookup result:`, neonUser ? `Found ${neonUser.id}` : "Not found")
    
    if (!neonUser && user.email) {
      // Neon user doesn't exist yet - create it
      console.log(`[Credits] Neon user doesn't exist yet, creating for auth user ${authUserId}`)
      const displayName = user.user_metadata?.name || user.user_metadata?.display_name || user.email.split("@")[0]
      neonUser = await getOrCreateNeonUser(authUserId, user.email, displayName)
      console.log(`[Credits] ✅ Created Neon user: ${neonUser.id}`)
    }
    
    if (!neonUser) {
      console.error(`[Credits] ❌ Failed to get or create Neon user for auth user ${authUserId}`)
      return NextResponse.json({ error: "User not found in database and could not be created" }, { status: 404 })
    }

    console.log(`[Credits] Using Neon user ID: ${neonUser.id}`)

    // Check if user already has credits (avoid duplicate grants)
    const existingCredits = await sql`
      SELECT balance FROM user_credits WHERE user_id = ${neonUser.id} LIMIT 1
    `
    console.log(`[Credits] Existing credits check:`, existingCredits.length > 0 ? `Found balance ${existingCredits[0].balance}` : "No credits record")

    if (existingCredits.length > 0) {
      const balance = existingCredits[0].balance
      console.log(`[Credits] User ${neonUser.id} already has ${balance} credits, skipping grant`)
      return NextResponse.json({
        success: true,
        message: "User already has credits",
        balance: balance,
      })
    }

    // Check if user has active subscription (only free users get welcome credits)
    const hasSubscription = await sql`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE user_id = ${neonUser.id} AND status = 'active'
    `
    console.log(`[Credits] Subscription check: ${hasSubscription[0].count} active subscription(s)`)

    if (hasSubscription[0].count > 0) {
      console.log(`[Credits] User ${neonUser.id} has active subscription, skipping free credits grant`)
      return NextResponse.json({
        success: true,
        message: "User has active subscription, skipping free credits",
      })
    }

    // Grant 2 free credits
    console.log(`[Credits] Granting 2 free credits to user ${neonUser.id}...`)
    const creditResult = await grantFreeUserCredits(neonUser.id)
    console.log(`[Credits] Credit grant result:`, creditResult)

    if (creditResult.success) {
      console.log(`[Credits] ✅ Free user credits (2) granted to user ${neonUser.id}. New balance: ${creditResult.newBalance}`)
      return NextResponse.json({
        success: true,
        message: "Free credits granted successfully",
        balance: creditResult.newBalance,
      })
    } else {
      console.error(`[Credits] ❌ Failed to grant free credits: ${creditResult.error}`)
      return NextResponse.json(
        {
          success: false,
          error: creditResult.error || "Failed to grant credits",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[Credits] ❌ Exception in grant-free-welcome endpoint:", error)
    if (error instanceof Error) {
      console.error("[Credits] Error stack:", error.stack)
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
