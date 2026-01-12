import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@/lib/supabase/server"
import { syncUserWithNeon } from "@/lib/user-sync"

/**
 * POST /api/auth/auto-confirm
 * 
 * Auto-confirms user email after signup (like paid users)
 * Uses Supabase Admin API to set email_confirm: true
 * 
 * SECURITY: This endpoint requires either:
 * 1. Authenticated user session where email matches the request email, OR
 * 2. Valid AUTO_CONFIRM_SECRET key (for post-signup flow before session exists)
 * 
 * This prevents attackers from confirming emails they don't own.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, userId, secret } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // SECURITY CHECK: Verify request is authorized
    let isAuthorized = false
    let verifiedUserId: string | null = userId || null // Store userId found during secret verification
    const supabaseAdmin = createAdminClient() // Create admin client early - needed for all paths

    // Method 1: Check if user is authenticated and email matches
    try {
      const supabase = await createServerClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        // Verify the email in the request matches the authenticated user's email
        if (authUser.email?.toLowerCase() === email.toLowerCase()) {
          isAuthorized = true
          verifiedUserId = authUser.id // Use authenticated user's ID
          console.log("[Auth Auto-Confirm] ✅ Authorized via authenticated session:", email)
        } else {
          console.warn("[Auth Auto-Confirm] ⚠️ Email mismatch - authenticated user:", authUser.email, "requested:", email)
        }
      }
    } catch (authError) {
      // No session exists - will check secret key below
      console.log("[Auth Auto-Confirm] No authenticated session, checking secret key...")
    }

    // Method 2: Check secret key (for post-signup flow before session exists)
    if (!isAuthorized) {
      const expectedSecret = process.env.AUTO_CONFIRM_SECRET
      
      if (!expectedSecret) {
        console.error("[Auth Auto-Confirm] ❌ AUTO_CONFIRM_SECRET not configured - endpoint disabled")
        return NextResponse.json(
          { error: "Auto-confirm endpoint not configured" },
          { status: 500 }
        )
      }

      if (!secret || secret !== expectedSecret) {
        console.error("[Auth Auto-Confirm] ❌ Invalid or missing secret key")
        return NextResponse.json(
          { error: "Unauthorized - invalid secret" },
          { status: 401 }
        )
      }

      // SECURITY FIX: When using secret key, we MUST verify account age (5-minute restriction)
      // This prevents confirming stale accounts even if userId is omitted
      let userToVerify: { id: string; email: string; created_at: string } | null = null

      // If userId provided, verify it directly
      if (userId) {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
        
        if (userError || !userData?.user) {
          console.error("[Auth Auto-Confirm] ❌ User not found for provided userId:", userId)
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          )
        }

        // Verify email matches
        if (userData.user.email?.toLowerCase() !== email.toLowerCase()) {
          console.error("[Auth Auto-Confirm] ❌ Email mismatch - userId email:", userData.user.email, "requested:", email)
          return NextResponse.json(
            { error: "Email does not match user" },
            { status: 400 }
          )
        }

        userToVerify = {
          id: userData.user.id,
          email: userData.user.email || email,
          created_at: userData.user.created_at
        }
      } else {
        // If userId not provided, find user by email first (before authorizing)
        // This ensures we can verify account age even when userId is omitted
        let foundUser: { id: string; email: string; created_at: string } | null = null
        let page = 1
        const perPage = 50
        
        while (!foundUser) {
          const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage,
          })
          
          if (listError) {
            console.error("[Auth Auto-Confirm] Error listing users:", listError)
            return NextResponse.json({ error: "Failed to find user" }, { status: 500 })
          }

          // Search for user in current page
          const user = usersData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
          
          if (user) {
            foundUser = {
              id: user.id,
              email: user.email || email,
              created_at: user.created_at
            }
            break
          }

          // If we got fewer results than perPage, we've reached the end
          if (usersData.users.length < perPage) {
            break
          }

          page++
          
          // Safety limit: prevent infinite loops (max 100 pages = 5000 users)
          if (page > 100) {
            console.error("[Auth Auto-Confirm] Reached pagination limit (100 pages)")
            break
          }
        }
        
        if (!foundUser) {
          console.error("[Auth Auto-Confirm] User not found:", email)
          return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        userToVerify = foundUser
      }

      // MANDATORY: Verify account was created recently (within last 5 minutes)
      // This check is REQUIRED when using secret-based auth, regardless of whether userId was provided
      if (userToVerify) {
        const createdAt = new Date(userToVerify.created_at)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
        
        if (createdAt < fiveMinutesAgo) {
          console.error("[Auth Auto-Confirm] ❌ Account too old - created:", createdAt, "now:", new Date())
          return NextResponse.json(
            { error: "Account must be created within last 5 minutes for auto-confirm" },
            { status: 400 }
          )
        }

        // Store the verified userId for later use
        verifiedUserId = userToVerify.id
        console.log("[Auth Auto-Confirm] ✅ Verified account is recent (created within 5 minutes)")
      }

      isAuthorized = true
      console.log("[Auth Auto-Confirm] ✅ Authorized via secret key")
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized - must be authenticated or provide valid secret" },
        { status: 401 }
      )
    }

    // Use verifiedUserId (set during authorization) or fall back to finding by email
    // verifiedUserId is set either from:
    // 1. Authenticated session (authUser.id)
    // 2. Secret-based auth with userId provided (userId)
    // 3. Secret-based auth without userId (found via email lookup)
    let userToConfirm = verifiedUserId

    // Only need to find user if verifiedUserId is still null (shouldn't happen, but safety check)
    if (!userToConfirm) {
      console.error("[Auth Auto-Confirm] ❌ No userId available - this should not happen")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[Auth Auto-Confirm] Auto-confirming email for:", email, `(userId: ${userToConfirm})`)

    // Auto-confirm email using Admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userToConfirm, {
      email_confirm: true,
    })

    if (updateError) {
      console.error("[Auth Auto-Confirm] Error confirming email:", updateError)
      return NextResponse.json({ error: "Failed to confirm email" }, { status: 500 })
    }

    console.log("[Auth Auto-Confirm] ✅ Email auto-confirmed for:", email)

    // Sync user with Neon database
    try {
      const neonUser = await syncUserWithNeon(userToConfirm, email, updateData.user.user_metadata?.name)
      console.log("[Auth Auto-Confirm] ✅ User synced with Neon:", neonUser?.id)
    } catch (syncError) {
      console.error("[Auth Auto-Confirm] ⚠️ Error syncing with Neon (non-critical):", syncError)
      // Don't fail if sync fails - email is already confirmed
    }

    return NextResponse.json({
      success: true,
      message: "Email auto-confirmed successfully",
      userId: userToConfirm,
    })
  } catch (error) {
    console.error("[Auth Auto-Confirm] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to auto-confirm email" },
      { status: 500 },
    )
  }
}
