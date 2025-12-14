import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/studio-pro/setup
 * Get user's Pro setup status
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get setup status (may not exist yet)
    const setupResult = await sql`
      SELECT * FROM user_pro_setup
      WHERE user_id = ${neonUser.id}
    `
    const setup = setupResult[0] || null

    // Get avatar count
    const avatarCountResult = await sql`
      SELECT COUNT(*)::int as count
      FROM user_avatar_images
      WHERE user_id = ${neonUser.id} AND is_active = true
    `
    const avatarCount = Number(avatarCountResult[0]?.count || 0)

    // Get brand assets count (table may have different schema)
    let brandAssetsCount = 0
    try {
      const brandAssetsCountResult = await sql`
        SELECT COUNT(*)::int as count
        FROM brand_assets
        WHERE user_id = ${neonUser.id}
      `
      brandAssetsCount = Number(brandAssetsCountResult[0]?.count || 0)
    } catch (error: any) {
      // If table doesn't exist or query fails, count is 0
      console.log("[STUDIO-PRO] Could not count brand assets:", error.message)
      brandAssetsCount = 0
    }

    // Get brand kits count
    const brandKitsCountResult = await sql`
      SELECT COUNT(*)::int as count
      FROM brand_kits
      WHERE user_id = ${neonUser.id}
    `
    const brandKitsCount = Number(brandKitsCountResult[0]?.count || 0)

    return NextResponse.json({
      setup: setup || {
        user_id: neonUser.id,
        has_completed_avatar_setup: false,
        has_completed_brand_setup: false,
        onboarding_completed_at: null,
        pro_features_unlocked: false,
        entry_selection: null,
      },
      counts: {
        avatarImages: avatarCount,
        brandAssets: brandAssetsCount,
        brandKits: brandKitsCount,
      },
      canUsePro: avatarCount >= 3,
    })
  } catch (error) {
    console.error("[STUDIO-PRO] Error fetching setup status:", error)
    return NextResponse.json(
      { error: "Failed to fetch setup status" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/studio-pro/setup
 * Update entry selection or unlock Pro
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { entrySelection, unlockPro } = body

    if (entrySelection) {
      // Validate entry selection
      const validSelections = ['just-me', 'me-product', 'editing', 'full-brand']
      if (!validSelections.includes(entrySelection)) {
        return NextResponse.json(
          { error: "Invalid entry selection" },
          { status: 400 }
        )
      }

      console.log("[STUDIO-PRO] Attempting to save entry selection:", {
        userId: neonUser.id,
        entrySelection,
      })
      
      await sql`
        INSERT INTO user_pro_setup (user_id, entry_selection, updated_at)
        VALUES (${neonUser.id}, ${entrySelection}, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          entry_selection = ${entrySelection},
          updated_at = NOW()
      `
      
      console.log("[STUDIO-PRO] Successfully saved entry selection")
    }

    if (unlockPro) {
      // Check if avatar setup is complete
      const avatarCount = await sql`
        SELECT COUNT(*) as count
        FROM user_avatar_images
        WHERE user_id = ${neonUser.id} AND is_active = true
      `

      const count = Number(avatarCount[0]?.count || 0)

      if (count < 3) {
        return NextResponse.json(
          { error: "Avatar setup incomplete. Need at least 3 images." },
          { status: 400 }
        )
      }

      await sql`
        INSERT INTO user_pro_setup (
          user_id, 
          pro_features_unlocked, 
          onboarding_completed_at,
          updated_at
        )
        VALUES (${neonUser.id}, true, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          pro_features_unlocked = true,
          onboarding_completed_at = COALESCE(user_pro_setup.onboarding_completed_at, NOW()),
          updated_at = NOW()
      `
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[STUDIO-PRO] Error updating setup:", {
      error,
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      stack: error?.stack,
    })
    return NextResponse.json(
      { 
        error: "Failed to update setup",
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}


