import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Get Neon user ID
    const neonUsers = await sql`
      SELECT id FROM users WHERE stack_auth_id = ${user.id}
    `

    if (neonUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const neonUserId = neonUsers[0].id

    // Get personal brand information
    const personalBrand = await sql`
      SELECT 
        upb.*,
        usp.color_preferences,
        usp.clothing_preferences,
        usp.style_categories,
        usp.settings_preferences,
        usp.location_vibes,
        usp.style_icons,
        usp.brand_references
      FROM user_personal_brand upb
      LEFT JOIN user_style_profile usp ON usp.personal_brand_id = upb.id
      WHERE upb.user_id = ${neonUserId}
      ORDER BY upb.created_at DESC
      LIMIT 1
    `

    if (personalBrand.length === 0) {
      return NextResponse.json({
        exists: false,
        completed: false,
      })
    }

    const brand = personalBrand[0]

    return NextResponse.json({
      exists: true,
      completed: brand.is_completed,
      data: {
        name: brand.name,
        businessType: brand.business_type,
        currentSituation: brand.current_situation,
        transformationStory: brand.transformation_story,
        futureVision: brand.future_vision,
        businessGoals: brand.business_goals,
        photoGoals: brand.photo_goals,
        stylePreferences: brand.style_preferences,
        colorPreferences: brand.color_preferences,
        clothingPreferences: brand.clothing_preferences,
        styleCategories: brand.style_categories,
        settingsPreferences: brand.settings_preferences,
        locationVibes: brand.location_vibes,
        styleIcons: brand.style_icons,
        brandReferences: brand.brand_references,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching personal brand:", error)
    return NextResponse.json({ error: "Failed to fetch personal brand" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const sql = neon(process.env.DATABASE_URL!)

    // Get Neon user ID
    const neonUsers = await sql`
      SELECT id FROM users WHERE stack_auth_id = ${user.id}
    `

    if (neonUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const neonUserId = neonUsers[0].id

    const existingBrand = await sql`
      SELECT id FROM user_personal_brand WHERE user_id = ${neonUserId}
    `

    let brandId: number

    if (existingBrand.length > 0) {
      // Update existing brand
      const result = await sql`
        UPDATE user_personal_brand
        SET
          name = ${body.name || ""},
          business_type = ${body.businessType || ""},
          current_situation = ${body.currentSituation || ""},
          transformation_story = ${body.transformationStory || ""},
          future_vision = ${body.futureVision || ""},
          business_goals = ${body.businessGoals || ""},
          photo_goals = ${body.photoGoals || ""},
          style_preferences = ${body.stylePreferences || ""},
          is_completed = ${body.isCompleted || false},
          updated_at = NOW()
        WHERE user_id = ${neonUserId}
        RETURNING id
      `
      brandId = result[0].id
    } else {
      // Insert new brand
      const result = await sql`
        INSERT INTO user_personal_brand (
          user_id,
          name,
          business_type,
          current_situation,
          transformation_story,
          future_vision,
          business_goals,
          photo_goals,
          style_preferences,
          is_completed,
          created_at,
          updated_at
        ) VALUES (
          ${neonUserId},
          ${body.name || ""},
          ${body.businessType || ""},
          ${body.currentSituation || ""},
          ${body.transformationStory || ""},
          ${body.futureVision || ""},
          ${body.businessGoals || ""},
          ${body.photoGoals || ""},
          ${body.stylePreferences || ""},
          ${body.isCompleted || false},
          NOW(),
          NOW()
        )
        RETURNING id
      `
      brandId = result[0].id
    }

    // Update style profile if provided
    if (body.styleProfile) {
      const existingProfile = await sql`
        SELECT id FROM user_style_profile WHERE user_id = ${neonUserId}
      `

      if (existingProfile.length > 0) {
        // Update existing profile
        await sql`
          UPDATE user_style_profile
          SET
            personal_brand_id = ${brandId},
            color_preferences = ${JSON.stringify(body.styleProfile.colorPreferences || {})},
            clothing_preferences = ${JSON.stringify(body.styleProfile.clothingPreferences || {})},
            style_categories = ${JSON.stringify(body.styleProfile.styleCategories || {})},
            settings_preferences = ${JSON.stringify(body.styleProfile.settingsPreferences || {})},
            location_vibes = ${JSON.stringify(body.styleProfile.locationVibes || {})},
            style_icons = ${JSON.stringify(body.styleProfile.styleIcons || {})},
            brand_references = ${JSON.stringify(body.styleProfile.brandReferences || {})},
            updated_at = NOW()
          WHERE user_id = ${neonUserId}
        `
      } else {
        // Insert new profile
        await sql`
          INSERT INTO user_style_profile (
            user_id,
            personal_brand_id,
            color_preferences,
            clothing_preferences,
            style_categories,
            settings_preferences,
            location_vibes,
            style_icons,
            brand_references,
            created_at,
            updated_at
          ) VALUES (
            ${neonUserId},
            ${brandId},
            ${JSON.stringify(body.styleProfile.colorPreferences || {})},
            ${JSON.stringify(body.styleProfile.clothingPreferences || {})},
            ${JSON.stringify(body.styleProfile.styleCategories || {})},
            ${JSON.stringify(body.styleProfile.settingsPreferences || {})},
            ${JSON.stringify(body.styleProfile.locationVibes || {})},
            ${JSON.stringify(body.styleProfile.styleIcons || {})},
            ${JSON.stringify(body.styleProfile.brandReferences || {})},
            NOW(),
            NOW()
          )
        `
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating personal brand:", error)
    return NextResponse.json({ error: "Failed to update personal brand" }, { status: 500 })
  }
}
