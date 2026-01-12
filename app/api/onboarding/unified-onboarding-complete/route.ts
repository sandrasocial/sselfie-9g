import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/neon"

/**
 * POST /api/onboarding/unified-onboarding-complete
 * 
 * Save unified onboarding wizard data to user_personal_brand
 * Single source of truth for all users (free, paid, subscription)
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

    // Get user's display name or name for user_personal_brand.name
    const userName = neonUser.display_name || neonUser.name || authUser.email?.split("@")[0] || "User"

    // Parse request body
    const {
      businessType,
      idealAudience,
      audienceChallenge,
      audienceTransformation,
      transformationStory,
      currentSituation,
      futureVision,
      visualAesthetic,
      feedStyle,
      selfieImages,
      fashionStyle,
      brandInspiration,
      inspirationLinks,
      contentPillars,
    } = await req.json()
    
    // Verify selfies are uploaded (required for wizard completion)
    const hasClientSelfies = Array.isArray(selfieImages) && selfieImages.length > 0
    
    // Secondary check: Verify in database (for validation, not blocking)
    const avatarImages = await sql`
      SELECT image_url FROM user_avatar_images
      WHERE user_id = ${neonUser.id} AND is_active = true
      LIMIT 1
    `
    
    console.log("[Unified Onboarding] Checking for selfies:", {
      userId: neonUser.id,
      userEmail: authUser.email,
      hasClientSelfies,
      hasDbSelfies: avatarImages.length > 0,
      clientSelfieCount: selfieImages?.length || 0,
      dbSelfieCount: avatarImages.length,
    })
    
    // Require selfies for wizard completion (needed for image generation)
    if (!hasClientSelfies && avatarImages.length === 0) {
      console.error("[Unified Onboarding] ❌ No selfies found - client:", hasClientSelfies, "DB:", avatarImages.length)
      return NextResponse.json(
        { error: "Please upload at least one selfie before completing the wizard" },
        { status: 400 }
      )
    }
    
    // If client has selfies but DB doesn't, log warning but allow completion
    if (hasClientSelfies && avatarImages.length === 0) {
      console.warn("[Unified Onboarding] ⚠️ Client has selfies but DB check failed - selfies may need to be re-uploaded")
    }

    // Prepare data for user_personal_brand
    // Map visual aesthetic array to JSONB
    const visualAestheticJson = Array.isArray(visualAesthetic) && visualAesthetic.length > 0
      ? JSON.stringify(visualAesthetic)
      : null

    // Map feed style to settings_preference (add to array if needed)
    // Feed style becomes part of settings_preference array
    const settingsPreferenceArray = feedStyle ? [feedStyle] : []
    const settingsPreferenceJson = settingsPreferenceArray.length > 0
      ? JSON.stringify(settingsPreferenceArray)
      : null

    // Map fashion style array to JSONB
    const fashionStyleJson = Array.isArray(fashionStyle) && fashionStyle.length > 0
      ? JSON.stringify(fashionStyle)
      : null

    // Map content pillars array to JSONB
    const contentPillarsJson = Array.isArray(contentPillars) && contentPillars.length > 0
      ? JSON.stringify(contentPillars)
      : null

    // Check if user_personal_brand record exists
    const existingBrand = await sql`
      SELECT id FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    if (existingBrand.length > 0) {
      // Update existing user_personal_brand record
      await sql`
        UPDATE user_personal_brand
        SET
          name = ${userName},
          business_type = ${businessType || null},
          ideal_audience = ${idealAudience || null},
          audience_challenge = ${audienceChallenge || null},
          audience_transformation = ${audienceTransformation || null},
          transformation_story = ${transformationStory || null},
          current_situation = ${currentSituation || null},
          future_vision = ${futureVision || null},
          visual_aesthetic = ${visualAestheticJson}::jsonb,
          settings_preference = ${settingsPreferenceJson}::jsonb,
          fashion_style = ${fashionStyleJson}::jsonb,
          brand_inspiration = ${brandInspiration || null},
          inspiration_links = ${inspirationLinks || null},
          content_pillars = ${contentPillarsJson}::jsonb,
          is_completed = true,
          updated_at = NOW()
        WHERE user_id = ${neonUser.id}
      `
      console.log("[Unified Onboarding] ✅ Updated existing user_personal_brand record")
    } else {
      // Create new user_personal_brand record
      await sql`
        INSERT INTO user_personal_brand (
          user_id,
          name,
          business_type,
          ideal_audience,
          audience_challenge,
          audience_transformation,
          transformation_story,
          current_situation,
          future_vision,
          visual_aesthetic,
          settings_preference,
          fashion_style,
          brand_inspiration,
          inspiration_links,
          content_pillars,
          is_completed,
          created_at,
          updated_at
        )
        VALUES (
          ${neonUser.id},
          ${userName},
          ${businessType || null},
          ${idealAudience || null},
          ${audienceChallenge || null},
          ${audienceTransformation || null},
          ${transformationStory || null},
          ${currentSituation || null},
          ${futureVision || null},
          ${visualAestheticJson}::jsonb,
          ${settingsPreferenceJson}::jsonb,
          ${fashionStyleJson}::jsonb,
          ${brandInspiration || null},
          ${inspirationLinks || null},
          ${contentPillarsJson}::jsonb,
          true,
          NOW(),
          NOW()
        )
      `
      console.log("[Unified Onboarding] ✅ Created new user_personal_brand record")
    }

    // Set onboarding_completed = true in users table
    await sql`
      UPDATE users
      SET onboarding_completed = true
      WHERE id = ${neonUser.id}
    `
    console.log("[Unified Onboarding] ✅ Set onboarding_completed = true")

    // FIX 5: Also create/update blueprint_subscribers record for backward compatibility
    // Write wizard data to BOTH tables so old and new code paths work
    const existingBlueprint = await sql`
      SELECT id, form_data, feed_style FROM blueprint_subscribers
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    // Construct form_data in legacy format for blueprint_subscribers
    const formDataForLegacy = {
      businessType: businessType || null,
      idealAudience: idealAudience || null,
      vibe: Array.isArray(visualAesthetic) && visualAesthetic.length > 0 
        ? visualAesthetic[0] 
        : "professional", // Map first visual_aesthetic to vibe
      visualAesthetic: visualAesthetic || [],
      fashionStyle: fashionStyle || [],
      brandInspiration: brandInspiration || null,
      inspirationLinks: inspirationLinks || null,
    }

    // Extract feed style from settings_preference (first item) or use default
    const feedStyleForLegacy = feedStyle || (Array.isArray(settingsPreferenceArray) && settingsPreferenceArray.length > 0
      ? settingsPreferenceArray[0]
      : "minimal")

    if (existingBlueprint.length > 0) {
      // UPDATE existing blueprint_subscribers record with wizard data
      await sql`
        UPDATE blueprint_subscribers
        SET 
          form_data = ${JSON.stringify(formDataForLegacy)}::jsonb,
          feed_style = ${feedStyleForLegacy},
          updated_at = NOW()
        WHERE user_id = ${neonUser.id}
      `
      console.log("[Unified Onboarding] ✅ Updated blueprint_subscribers with wizard data for backward compatibility")
    } else {
      // INSERT new blueprint_subscribers record with wizard data
      const accessToken = crypto.randomUUID()
      await sql`
        INSERT INTO blueprint_subscribers (
          user_id,
          email,
          name,
          access_token,
          form_data,
          feed_style,
          created_at,
          updated_at
        )
        VALUES (
          ${neonUser.id},
          ${authUser.email || null},
          ${userName},
          ${accessToken},
          ${JSON.stringify(formDataForLegacy)}::jsonb,
          ${feedStyleForLegacy},
          NOW(),
          NOW()
        )
      `
      console.log("[Unified Onboarding] ✅ Created blueprint_subscribers record with wizard data for backward compatibility")
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    })
  } catch (error) {
    console.error("[Unified Onboarding] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save onboarding data" },
      { status: 500 }
    )
  }
}
