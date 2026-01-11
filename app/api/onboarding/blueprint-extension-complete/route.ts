import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/neon"

/**
 * POST /api/onboarding/blueprint-extension-complete
 * 
 * Save blueprint extension data and mark onboarding as complete
 * Saves to blueprint_subscribers.form_data (JSONB: dreamClient, struggle, feed_style)
 * Sets users.onboarding_completed = true
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user by auth ID
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const { dreamClient, struggle, feedStyle } = body

    console.log("[Blueprint Extension] Saving extension data for user:", neonUser.id)

    // Check if blueprint state exists for this user
    const existing = await sql`
      SELECT id, form_data
      FROM blueprint_subscribers
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    const currentFormData = existing.length > 0 && existing[0].form_data 
      ? (typeof existing[0].form_data === 'string' ? JSON.parse(existing[0].form_data) : existing[0].form_data)
      : {}

    // Merge extension data with existing form_data
    const updatedFormData = {
      ...currentFormData,
      dreamClient: dreamClient || currentFormData.dreamClient || null,
      struggle: struggle || currentFormData.struggle || null,
    }

    if (existing.length > 0) {
      // Update existing blueprint state
      await sql`
        UPDATE blueprint_subscribers
        SET
          form_data = ${JSON.stringify(updatedFormData)},
          feed_style = ${feedStyle || null},
          updated_at = NOW()
        WHERE user_id = ${neonUser.id}
      `
    } else {
      // Create new blueprint state for user (shouldn't happen if base wizard completed, but handle gracefully)
      const accessToken = crypto.randomUUID()
      
      await sql`
        INSERT INTO blueprint_subscribers (
          email,
          name,
          access_token,
          user_id,
          form_data,
          feed_style,
          created_at,
          updated_at
        )
        VALUES (
          ${neonUser.email},
          ${neonUser.display_name || neonUser.email?.split("@")[0] || "User"},
          ${accessToken},
          ${neonUser.id},
          ${JSON.stringify(updatedFormData)},
          ${feedStyle || null},
          NOW(),
          NOW()
        )
      `
    }

    // Set onboarding_completed = true (Decision 3: After extension completion)
    await sql`
      UPDATE users
      SET onboarding_completed = TRUE
      WHERE id = ${neonUser.id}
    `

    console.log("[Blueprint Extension] ✅ Extension saved and onboarding marked as complete for user:", neonUser.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Blueprint Extension] Error saving extension:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save blueprint extension" },
      { status: 500 },
    )
  }
}
