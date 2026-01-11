import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * API endpoint to fetch user onboarding status
 * Returns: onboarding_completed, blueprint_welcome_shown_at
 */
export async function GET(request: NextRequest) {
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

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch onboarding status from users table
    const result = await sql`
      SELECT 
        onboarding_completed,
        blueprint_welcome_shown_at
      FROM users
      WHERE id = ${neonUser.id}
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has blueprint state (Decision 3: used to determine if user has progressed)
    const blueprintState = await sql`
      SELECT id FROM blueprint_subscribers
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    const hasBlueprintState = blueprintState.length > 0

    // Check if user has base wizard data (Decision 3: checks if base wizard completed)
    // Unified wizard saves business, dreamClient, vibe to user_personal_brand
    const baseWizardData = await sql`
      SELECT id FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      AND (
        name IS NOT NULL OR
        business_type IS NOT NULL OR
        color_theme IS NOT NULL OR
        visual_aesthetic IS NOT NULL OR
        brand_vibe IS NOT NULL OR
        target_audience IS NOT NULL OR
        current_situation IS NOT NULL
      )
      LIMIT 1
    `

    const hasBaseWizardData = baseWizardData.length > 0

    // Check if user has extension data (Decision 3: checks if blueprint extension completed)
    // Unified wizard saves dreamClient, feedStyle to blueprint_subscribers
    let hasExtensionData = false
    if (hasBlueprintState) {
      const blueprintRecord = await sql`
        SELECT form_data, dream_client, feed_style
        FROM blueprint_subscribers
        WHERE user_id = ${neonUser.id}
        LIMIT 1
      `
      if (blueprintRecord.length > 0) {
        const record = blueprintRecord[0]
        // Check for extension data: dreamClient (in form_data or dream_client column) and feedStyle
        const formData = typeof record.form_data === 'string' 
          ? JSON.parse(record.form_data) 
          : record.form_data
        hasExtensionData = !!(
          (formData?.dreamClient || record.dream_client) && 
          record.feed_style
        )
      }
    }

    return NextResponse.json({
      onboarding_completed: result[0].onboarding_completed || false,
      blueprint_welcome_shown_at: result[0].blueprint_welcome_shown_at,
      hasBlueprintState: hasBlueprintState,
      hasBaseWizardData: hasBaseWizardData,
      hasExtensionData: hasExtensionData,
    })
  } catch (error) {
    console.error("[Onboarding Status] Error fetching onboarding status:", error)
    return NextResponse.json({ error: "Failed to fetch onboarding status" }, { status: 500 })
  }
}
