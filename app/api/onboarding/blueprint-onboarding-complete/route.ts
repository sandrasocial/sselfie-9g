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

    // Get user's display name or name for blueprint_subscribers.name (required field)
    // Try display_name first, then name, then email prefix, then "User" as fallback
    const userName = neonUser.display_name || neonUser.name || authUser.email?.split("@")[0] || "User"

    // Generate access_token (required field for blueprint_subscribers)
    // Since we only use authenticated users now, generate a token for consistency
    const accessToken = crypto.randomUUID()

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
      selfieImages, // Include selfie images (already uploaded, just for reference)
    } = await req.json()
    
    // Verify selfies are uploaded (required for wizard completion)
    // Primary check: Use client-side state (formData.selfieImages) as source of truth
    // The selfies are uploaded via /api/blueprint/upload-selfies which saves to user_avatar_images
    // If client has selfie URLs, they should be in the DB
    const hasClientSelfies = Array.isArray(selfieImages) && selfieImages.length > 0
    
    // Secondary check: Verify in database (for validation, not blocking)
    const avatarImages = await sql`
      SELECT image_url FROM user_avatar_images
      WHERE user_id = ${neonUser.id} AND is_active = true
      LIMIT 1
    `
    
    console.log("[Blueprint Onboarding] Checking for selfies:", {
      userId: neonUser.id,
      userEmail: authUser.email,
      hasClientSelfies,
      hasDbSelfies: avatarImages.length > 0,
      clientSelfieCount: selfieImages?.length || 0,
      dbSelfieCount: avatarImages.length,
      clientSelfies: selfieImages,
    })
    
    // Require selfies for wizard completion (needed for image generation)
    if (!hasClientSelfies && avatarImages.length === 0) {
      console.error("[Blueprint Onboarding] ❌ No selfies found - client:", hasClientSelfies, "DB:", avatarImages.length)
      return NextResponse.json(
        { error: "Please upload at least one selfie before completing the wizard" },
        { status: 400 }
      )
    }
    
    // If client has selfies but DB doesn't, log warning but allow completion
    // (This shouldn't happen, but if upload succeeded, we trust the client state)
    if (hasClientSelfies && avatarImages.length === 0) {
      console.warn("[Blueprint Onboarding] ⚠️ Client has selfies but DB check failed - selfies may need to be re-uploaded")
      // Don't block completion, but log for investigation
    }

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

    // Build comprehensive context for Maya from blueprint wizard
    // Combine photo-related fields into photo_goals for Maya context
    const photoGoalsParts: string[] = []
    if (lightingKnowledge) photoGoalsParts.push(`Lighting knowledge: ${lightingKnowledge}`)
    if (angleAwareness) photoGoalsParts.push(`Angle awareness: ${angleAwareness}`)
    if (currentSelfieHabits) photoGoalsParts.push(`Current selfie habits: ${currentSelfieHabits}`)
    const photoGoals = photoGoalsParts.length > 0 ? photoGoalsParts.join("; ") : null

    // Combine style-related fields into style_preferences for Maya context
    const stylePreferencesParts: string[] = []
    if (editingStyle) stylePreferencesParts.push(`Editing style: ${editingStyle}`)
    if (consistencyLevel) stylePreferencesParts.push(`Consistency level: ${consistencyLevel}`)
    const stylePreferences = stylePreferencesParts.length > 0 ? stylePreferencesParts.join("; ") : null

    // Step 1: Save ALL blueprint wizard data to user_personal_brand for Maya context
    const existingBrand = await sql`
      SELECT id FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    if (existingBrand.length > 0) {
      // Update existing user_personal_brand record with ALL blueprint wizard data
      // This ensures Maya has access to the complete blueprint wizard context
      await sql`
        UPDATE user_personal_brand
        SET
          business_type = ${business || null},
          target_audience = ${dreamClient || null},
          brand_vibe = ${vibe || null},
          visual_aesthetic = ${vibe ? JSON.stringify([vibe]) : null},
          settings_preference = ${feedStyle ? JSON.stringify([feedStyle]) : null},
          photo_goals = ${photoGoals || null},
          style_preferences = ${stylePreferences || null},
          updated_at = NOW()
        WHERE user_id = ${neonUser.id}
      `
    } else {
      // Create new user_personal_brand record with ALL blueprint wizard data
      // This ensures Maya has access to the complete blueprint wizard context
      await sql`
        INSERT INTO user_personal_brand (
          user_id,
          business_type,
          target_audience,
          brand_vibe,
          visual_aesthetic,
          settings_preference,
          photo_goals,
          style_preferences,
          created_at,
          updated_at
        )
        VALUES (
          ${neonUser.id},
          ${business || null},
          ${dreamClient || null},
          ${vibe || null},
          ${vibe ? JSON.stringify([vibe]) : null},
          ${feedStyle ? JSON.stringify([feedStyle]) : null},
          ${photoGoals || null},
          ${stylePreferences || null},
          NOW(),
          NOW()
        )
      `
    }

    // Step 2: Save extension data to blueprint_subscribers
    // Also save selfie image URLs to blueprint_subscribers.selfie_image_urls for backward compatibility
    const existingBlueprint = await sql`
      SELECT id FROM blueprint_subscribers
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `
    
    // Get selfie URLs from user_avatar_images (already uploaded)
    const selfieUrls = await sql`
      SELECT image_url FROM user_avatar_images
      WHERE user_id = ${neonUser.id} AND is_active = true
      ORDER BY display_order ASC, uploaded_at ASC
    `
    const selfieImageUrls = selfieUrls.map((row: any) => row.image_url)

    if (existingBlueprint.length > 0) {
      // Update existing blueprint_subscribers record
      await sql`
        UPDATE blueprint_subscribers
        SET
          form_data = ${JSON.stringify(formData)}::jsonb,
          business = ${business || null},
          dream_client = ${dreamClient || null},
          feed_style = ${feedStyle || null},
          selfie_image_urls = ${JSON.stringify(selfieImageUrls)}::jsonb,
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
          access_token,
          form_data,
          business,
          dream_client,
          feed_style,
          selfie_image_urls,
          created_at,
          updated_at
        )
        VALUES (
          ${neonUser.id},
          ${authUser.email || null},
          ${userName},
          ${accessToken},
          ${JSON.stringify(formData)}::jsonb,
          ${business || null},
          ${dreamClient || null},
          ${feedStyle || null},
          ${JSON.stringify(selfieImageUrls)}::jsonb,
          NOW(),
          NOW()
        )
      `
    }

    // Note: Credits are already granted on signup via app/auth/callback/route.ts
    // No need to grant credits here - users already have 2 credits available before onboarding
    
    // Set onboarding_completed to true when wizard completes (all steps including selfies)
    // This allows the wizard to properly close and not reopen on page reload
    await sql`
      UPDATE users
      SET 
        onboarding_completed = true,
        updated_at = NOW()
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
