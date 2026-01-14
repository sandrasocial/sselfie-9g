import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

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

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Fetching brand profile for user:", neonUser.id)

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
      WHERE upb.user_id = ${neonUser.id}
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

    // Parse JSONB fields that might be strings
    // Also converts objects to arrays (for visual_aesthetic and fashion_style)
    const parseJsonb = (value: any, convertObjectToArray: boolean = false) => {
      if (!value) return null
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          // If it's still a string after parsing, parse again (handles double-stringified data)
          if (typeof parsed === 'string') {
            try {
              const doubleParsed = JSON.parse(parsed)
              // If object and should convert, convert to array
              if (convertObjectToArray && typeof doubleParsed === 'object' && !Array.isArray(doubleParsed) && doubleParsed !== null) {
                return Object.keys(doubleParsed)
              }
              return doubleParsed
            } catch (e2) {
              // If second parse fails, might be malformed like '{"luxury"}'
              // Try to extract key from string
              const keyMatch = parsed.match(/"([^"]+)"/)
              if (keyMatch && convertObjectToArray) {
                return [keyMatch[1]]
              }
              return parsed
            }
          }
          // If object and should convert, convert to array
          if (convertObjectToArray && typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
            return Object.keys(parsed)
          }
          return parsed
        } catch (e) {
          // If parsing fails, try to extract key from malformed string like '{"luxury"}'
          if (convertObjectToArray) {
            const keyMatch = value.match(/"([^"]+)"/)
            if (keyMatch) {
              return [keyMatch[1]]
            }
          }
          // If extraction fails, return as-is (might be a plain string)
          return value
        }
      }
      // If it's already an object and should convert, convert to array
      if (convertObjectToArray && typeof value === 'object' && !Array.isArray(value) && value !== null) {
        return Object.keys(value)
      }
      // If it's already an array or object, return as-is
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        return value
      }
      return value
    }

    return NextResponse.json({
      exists: true,
      completed: brand.is_completed,
      data: {
        name: brand.name,
        businessType: brand.business_type,
        currentSituation: brand.current_situation,
        transformationStory: brand.transformation_story,
        targetAudience: brand.target_audience,
        brandVoice: brand.brand_voice,
        languageStyle: brand.language_style,
        contentThemes: brand.content_themes,
        brandVibe: brand.brand_vibe,
        colorMood: brand.color_mood,
        colorTheme: brand.color_theme,
        colorPalette: parseJsonb(brand.color_palette),
        futureVision: brand.future_vision,
        contentGoals: brand.content_goals,
        photoGoals: brand.photo_goals,
        stylePreferences: parseJsonb(brand.style_preferences),
        visualAesthetic: parseJsonb(brand.visual_aesthetic, true), // Convert objects to arrays
        settingsPreference: parseJsonb(brand.settings_preference),
        fashionStyle: parseJsonb(brand.fashion_style, true), // Convert objects to arrays
        idealAudience: brand.ideal_audience,
        audienceChallenge: brand.audience_challenge,
        audienceTransformation: brand.audience_transformation,
        communicationVoice: brand.communication_voice,
        signaturePhrases: brand.signature_phrases,
        brandInspiration: brand.brand_inspiration,
        inspirationLinks: brand.inspiration_links,
        contentPillars: parseJsonb(brand.content_pillars),
        // Style profile fields
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
    console.log("[v0] Saving brand profile with data:", {
      userId: user.id,
      colorTheme: body.colorTheme,
      hasCustomColors: !!body.customColors,
      name: body.name,
      businessType: body.businessType,
      visualAesthetic: body.visualAesthetic,
      fashionStyle: body.fashionStyle,
      settingsPreference: body.settingsPreference,
    })

    const sql = neon(process.env.DATABASE_URL!)

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)

    if (!neonUser) {
      console.error("[v0] User not found for auth ID:", user.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Found Neon user:", neonUser.id, neonUser.email)

    const existingBrand = await sql`
      SELECT id FROM user_personal_brand WHERE user_id = ${neonUser.id}
    `

    let brandId: number

    if (existingBrand.length > 0) {
      console.log("[v0] Updating existing brand profile:", existingBrand[0].id)
      // Use COALESCE to only update fields that are provided (not undefined)
      // This prevents overwriting existing data with empty strings
      const result = await sql`
        UPDATE user_personal_brand
        SET
          name = COALESCE(${body.name ?? null}, name),
          business_type = COALESCE(${body.businessType ?? null}, business_type),
          current_situation = COALESCE(${body.currentSituation ?? null}, current_situation),
          transformation_story = COALESCE(${body.transformationStory ?? null}, transformation_story),
          target_audience = COALESCE(${body.targetAudience ?? null}, target_audience),
          brand_voice = COALESCE(${body.brandVoice ?? null}, brand_voice),
          language_style = COALESCE(${body.languageStyle ?? null}, language_style),
          content_themes = COALESCE(${body.contentThemes ?? null}, content_themes),
          brand_vibe = COALESCE(${body.brandVibe ?? null}, brand_vibe),
          color_mood = COALESCE(${body.colorMood ?? null}, color_mood),
          color_theme = COALESCE(${body.colorTheme ?? null}, color_theme),
          color_palette = COALESCE(${body.customColors ?? null}, color_palette),
          future_vision = COALESCE(${body.futureVision ?? null}, future_vision),
          content_goals = COALESCE(${body.contentGoals ?? null}, content_goals),
          photo_goals = COALESCE(${body.photoGoals ?? null}, photo_goals),
          content_pillars = COALESCE(${body.contentPillars && (Array.isArray(body.contentPillars) ? body.contentPillars.length > 0 : true) ? JSON.stringify(body.contentPillars) : null}::jsonb, content_pillars),
          visual_aesthetic = COALESCE(${body.visualAesthetic && (Array.isArray(body.visualAesthetic) ? body.visualAesthetic.length > 0 : true) ? JSON.stringify(body.visualAesthetic) : null}::jsonb, visual_aesthetic),
          settings_preference = COALESCE(${body.settingsPreference && (Array.isArray(body.settingsPreference) ? body.settingsPreference.length > 0 : true) ? JSON.stringify(body.settingsPreference) : null}::jsonb, settings_preference),
          fashion_style = COALESCE(${body.fashionStyle && (Array.isArray(body.fashionStyle) ? body.fashionStyle.length > 0 : true) ? JSON.stringify(body.fashionStyle) : null}::jsonb, fashion_style),
          ideal_audience = COALESCE(${body.idealAudience ?? null}, ideal_audience),
          audience_challenge = COALESCE(${body.audienceChallenge ?? null}, audience_challenge),
          audience_transformation = COALESCE(${body.audienceTransformation ?? null}, audience_transformation),
          communication_voice = COALESCE(${body.communicationVoice ?? null}, communication_voice),
          signature_phrases = COALESCE(${body.signaturePhrases ?? null}, signature_phrases),
          brand_inspiration = COALESCE(${body.brandInspiration ?? null}, brand_inspiration),
          inspiration_links = COALESCE(${body.inspirationLinks ?? null}, inspiration_links),
          is_completed = COALESCE(${body.isCompleted ?? null}, is_completed),
          updated_at = NOW()
        WHERE user_id = ${neonUser.id}
        RETURNING id
      `
      brandId = result[0].id
      console.log("[v0] Updated brand profile successfully:", brandId)
    } else {
      console.log("[v0] Creating new brand profile for user:", neonUser.id)
      const result = await sql`
        INSERT INTO user_personal_brand (
          user_id,
          name,
          business_type,
          current_situation,
          transformation_story,
          target_audience,
          brand_voice,
          language_style,
          content_themes,
          brand_vibe,
          color_mood,
          color_theme,
          color_palette,
          future_vision,
          content_goals,
          photo_goals,
          content_pillars,
          visual_aesthetic,
          settings_preference,
          fashion_style,
          ideal_audience,
          audience_challenge,
          audience_transformation,
          communication_voice,
          signature_phrases,
          brand_inspiration,
          inspiration_links,
          is_completed,
          created_at,
          updated_at
        ) VALUES (
          ${neonUser.id},
          ${body.name || ""},
          ${body.businessType || ""},
          ${body.currentSituation || ""},
          ${body.transformationStory || ""},
          ${body.targetAudience || ""},
          ${body.brandVoice || ""},
          ${body.languageStyle || ""},
          ${body.contentThemes || ""},
          ${body.brandVibe || ""},
          ${body.colorMood || ""},
          ${body.colorTheme || ""},
          ${body.customColors || null},
          ${body.futureVision || ""},
          ${body.contentGoals || ""},
          ${body.photoGoals || ""},
          ${body.contentPillars ? JSON.stringify(body.contentPillars) : null}::jsonb,
          ${body.visualAesthetic || ""},
          ${body.settingsPreference || ""},
          ${body.fashionStyle || ""},
          ${body.idealAudience || ""},
          ${body.audienceChallenge || ""},
          ${body.audienceTransformation || ""},
          ${body.communicationVoice || ""},
          ${body.signaturePhrases || ""},
          ${body.brandInspiration || ""},
          ${body.inspirationLinks || ""},
          ${body.isCompleted || false},
          NOW(),
          NOW()
        )
        RETURNING id
      `
      brandId = result[0].id
      console.log("[v0] Created brand profile successfully:", brandId)
    }

    // Update style profile if provided
    if (body.styleProfile) {
      const existingProfile = await sql`
        SELECT id FROM user_style_profile WHERE user_id = ${neonUser.id}
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
          WHERE user_id = ${neonUser.id}
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
            ${neonUser.id},
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

    const existingMemory = await sql`
      SELECT id FROM maya_personal_memory WHERE user_id = ${neonUser.id}
    `

    if (existingMemory.length > 0) {
      // Update existing memory to link to brand
      await sql`
        UPDATE maya_personal_memory
        SET personal_brand_id = ${brandId}, updated_at = NOW()
        WHERE user_id = ${neonUser.id}
      `
    } else {
      // Create new memory linked to brand
      await sql`
        INSERT INTO maya_personal_memory (
          user_id,
          personal_brand_id,
          memory_version,
          preferred_topics,
          conversation_style,
          successful_prompt_patterns,
          user_feedback_patterns,
          personal_insights,
          ongoing_goals,
          created_at,
          updated_at,
          last_memory_update
        ) VALUES (
          ${neonUser.id},
          ${brandId},
          1,
          '[]'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb,
          NOW(),
          NOW(),
          NOW()
        )
      `
    }

    console.log("[v0] Brand profile save complete!")
    return NextResponse.json({ success: true, brandId })
  } catch (error) {
    console.error("[v0] Error updating personal brand:", error)
    return NextResponse.json({ error: "Failed to update personal brand" }, { status: 500 })
  }
}
