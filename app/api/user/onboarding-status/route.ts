import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { deriveHasExtensionData, deriveHasSelfies } from "@/lib/onboarding/status"
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
    // Unified wizard saves business/audience/story fields to user_personal_brand
    const baseWizardData = await sql`
      SELECT id FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      AND (
        name IS NOT NULL OR
        business_type IS NOT NULL OR
        ideal_audience IS NOT NULL OR
        audience_challenge IS NOT NULL OR
        audience_transformation IS NOT NULL OR
        transformation_story IS NOT NULL OR
        current_situation IS NOT NULL OR
        future_vision IS NOT NULL OR
        settings_preference IS NOT NULL OR
        feed_style_variation_id IS NOT NULL OR
        visual_aesthetic IS NOT NULL OR
        fashion_style IS NOT NULL OR
        brand_inspiration IS NOT NULL OR
        content_pillars IS NOT NULL
      )
      LIMIT 1
    `

    const hasBaseWizardData = baseWizardData.length > 0

    // Check if user has extension data (Decision 3: checks if blueprint extension completed)
    // Unified wizard saves dreamClient, feedStyle to blueprint_subscribers
    let hasExtensionData = false
    // Avatar images are canonical selfie source for onboarding, regardless of blueprint state.
    const avatarImages = await sql`
      SELECT COUNT(*)::int AS count
      FROM user_avatar_images
      WHERE user_id = ${neonUser.id} AND is_active = true
    `
    const hasSelfies = deriveHasSelfies(Number(avatarImages[0]?.count || 0))

    if (hasBlueprintState) {
      const blueprintRecord = await sql`
        SELECT form_data, dream_client, feed_style
        FROM blueprint_subscribers
        WHERE user_id = ${neonUser.id}
        LIMIT 1
      `
      const record = blueprintRecord[0]
      hasExtensionData = deriveHasExtensionData(
        record
          ? {
              formData: record.form_data,
              dreamClient: record.dream_client,
              feedStyle: record.feed_style,
            }
          : null,
      )
    }

    return NextResponse.json({
      onboarding_completed: result[0].onboarding_completed || false,
      blueprint_welcome_shown_at: result[0].blueprint_welcome_shown_at,
      hasBlueprintState: hasBlueprintState,
      hasBaseWizardData: hasBaseWizardData,
      hasExtensionData: hasExtensionData,
      hasSelfies: hasSelfies, // Check if selfies are uploaded (required for image generation)
    })
  } catch (error) {
    console.error("[Onboarding Status] Error fetching onboarding status:", error)
    return NextResponse.json({ error: "Failed to fetch onboarding status" }, { status: 500 })
  }
}
