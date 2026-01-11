import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/neon"

/**
 * POST /api/onboarding/blueprint-onboarding-complete
 * 
 * Save unified blueprint onboarding data and mark onboarding as complete
 * Saves all form data to blueprint_subscribers.form_data (JSONB)
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

    // Parse request body
    const {
      business,
      dreamClient,
      vibe,
      lightingKnowledge,
      angleAwareness,
      editingStyle,
      consistencyLevel,
      currentSelfieHabits,
      feedStyle,
    } = await req.json()

    // Build form data object (all fields) for blueprint_subscribers
    const formData = {
      business,
      dreamClient,
      struggle: "", // Not collected in unified wizard (kept for compatibility)
      vibe,
      lightingKnowledge,
      angleAwareness,
      editingStyle,
      consistencyLevel,
      currentSelfieHabits,
    }

    // Step 1: Save base wizard data to user_personal_brand (for hasBaseWizardData check)
    const existingBrand = await sql`
      SELECT id FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    if (existingBrand.length > 0) {
      // Update existing user_personal_brand record with base wizard data
      await sql`
        UPDATE user_personal_brand
        SET
          business_type = ${business || null},
          target_audience = ${dreamClient || null},
          brand_vibe = ${vibe || null},
          visual_aesthetic = ${vibe || null},
          updated_at = NOW()
        WHERE user_id = ${neonUser.id}
      `
    } else {
      // Create new user_personal_brand record with base wizard data
      await sql`
        INSERT INTO user_personal_brand (
          user_id,
          business_type,
          target_audience,
          brand_vibe,
          visual_aesthetic,
          created_at,
          updated_at
        )
        VALUES (
          ${neonUser.id},
          ${business || null},
          ${dreamClient || null},
          ${vibe || null},
          ${vibe || null},
          NOW(),
          NOW()
        )
      `
    }

    // Step 2: Save extension data to blueprint_subscribers
    const existingBlueprint = await sql`
      SELECT id FROM blueprint_subscribers
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    if (existingBlueprint.length > 0) {
      // Update existing blueprint_subscribers record
      await sql`
        UPDATE blueprint_subscribers
        SET
          form_data = ${JSON.stringify(formData)}::jsonb,
          business = ${business || null},
          dream_client = ${dreamClient || null},
          feed_style = ${feedStyle || null},
          updated_at = NOW()
        WHERE user_id = ${neonUser.id}
      `
    } else {
      // Create new blueprint_subscribers record
      await sql`
        INSERT INTO blueprint_subscribers (
          user_id,
          email,
          name,
          form_data,
          business,
          dream_client,
          feed_style,
          created_at,
          updated_at
        )
        VALUES (
          ${neonUser.id},
          ${authUser.email || null},
          ${neonUser.name || null},
          ${JSON.stringify(formData)}::jsonb,
          ${business || null},
          ${dreamClient || null},
          ${feedStyle || null},
          NOW(),
          NOW()
        )
      `
    }

    // Note: onboarding_completed will be set to true after grid generation
    // (per Decision 3 plan: onboarding complete only after grid is generated)
    // Just update timestamp for now
    await sql`
      UPDATE users
      SET updated_at = NOW()
      WHERE id = ${neonUser.id}
    `

    return NextResponse.json({
      success: true,
      message: "Blueprint onboarding data saved successfully",
    })
  } catch (error) {
    console.error("[Blueprint Onboarding] Error saving data:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save blueprint onboarding data",
      },
      { status: 500 }
    )
  }
}
