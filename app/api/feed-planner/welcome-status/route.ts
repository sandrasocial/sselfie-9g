import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

/**
 * GET /api/feed-planner/welcome-status
 * 
 * Returns whether the welcome wizard has been shown to the user
 */
export async function GET(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()
    
    try {
      const [brandData] = await sql`
        SELECT feed_planner_welcome_shown
        FROM user_personal_brand
        WHERE user_id = ${user.id}::text
        LIMIT 1
      ` as any[]

      return NextResponse.json({
        welcomeShown: brandData?.feed_planner_welcome_shown || false,
      })
    } catch (error: any) {
      // If column doesn't exist, return false (not shown)
      if (error?.message?.includes('feed_planner_welcome_shown') || error?.code === '42703') {
        console.log("[Welcome Status] ⚠️ Column doesn't exist, returning false")
        return NextResponse.json({
          welcomeShown: false,
        })
      }
      throw error
    }
  } catch (error: any) {
    console.error("[Welcome Status] Error:", {
      message: error?.message || String(error),
      code: error?.code,
      stack: error?.stack,
    })
    return NextResponse.json(
      { error: "Failed to fetch welcome status" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/feed-planner/welcome-status
 * 
 * Marks the welcome wizard as shown for the user
 */
export async function POST(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()
    
    // First, check if user_personal_brand record exists
    const existingBrand = await sql`
      SELECT id, feed_planner_welcome_shown
      FROM user_personal_brand
      WHERE user_id = ${user.id}::text
      LIMIT 1
    ` as any[]
    
    if (existingBrand && existingBrand.length > 0) {
      // Update existing record
      // Check if column exists first (handle gracefully if migration hasn't run)
      try {
        await sql`
          UPDATE user_personal_brand
          SET 
            feed_planner_welcome_shown = true,
            updated_at = NOW()
          WHERE user_id = ${user.id}::text
        `
        console.log("[Welcome Status] ✅ Updated existing brand record")
      } catch (updateError: any) {
        // If column doesn't exist, try to add it
        if (updateError?.message?.includes('feed_planner_welcome_shown') || updateError?.code === '42703') {
          console.log("[Welcome Status] ⚠️ Column doesn't exist, attempting to add it...")
          try {
            await sql`
              ALTER TABLE user_personal_brand 
              ADD COLUMN IF NOT EXISTS feed_planner_welcome_shown BOOLEAN DEFAULT false
            `
            // Retry update
            await sql`
              UPDATE user_personal_brand
              SET 
                feed_planner_welcome_shown = true,
                updated_at = NOW()
              WHERE user_id = ${user.id}::text
            `
            console.log("[Welcome Status] ✅ Column added and updated")
          } catch (alterError) {
            console.error("[Welcome Status] ❌ Failed to add column:", alterError)
            throw alterError
          }
        } else {
          throw updateError
        }
      }
    } else {
      // Insert new record (if user_personal_brand doesn't exist)
      try {
        await sql`
          INSERT INTO user_personal_brand (user_id, feed_planner_welcome_shown, updated_at, created_at)
          VALUES (${user.id}::text, true, NOW(), NOW())
        `
        console.log("[Welcome Status] ✅ Created new brand record")
      } catch (insertError: any) {
        // If column doesn't exist, add it and retry
        if (insertError?.message?.includes('feed_planner_welcome_shown') || insertError?.code === '42703') {
          console.log("[Welcome Status] ⚠️ Column doesn't exist, attempting to add it...")
          try {
            await sql`
              ALTER TABLE user_personal_brand 
              ADD COLUMN IF NOT EXISTS feed_planner_welcome_shown BOOLEAN DEFAULT false
            `
            // Retry insert
            await sql`
              INSERT INTO user_personal_brand (user_id, feed_planner_welcome_shown, updated_at, created_at)
              VALUES (${user.id}::text, true, NOW(), NOW())
            `
            console.log("[Welcome Status] ✅ Column added and record created")
          } catch (alterError) {
            console.error("[Welcome Status] ❌ Failed to add column:", alterError)
            throw alterError
          }
        } else {
          throw insertError
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Welcome Status] Error:", {
      message: error?.message || String(error),
      code: error?.code,
      stack: error?.stack,
    })
    return NextResponse.json(
      { 
        error: "Failed to update welcome status",
        details: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
