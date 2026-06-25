import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }


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

    // Sanitize settingsPreference to remove corrupted nested JSON strings
    const sanitizeSettingsPreference = (settings: any): string[] | null => {
      const validStyles = [
        "luxury",
        "minimal",
        "beige",
        "Dark & Moody",
        "Beige Aesthetic",
        "Light & Minimalistic",
        "Luxury Future Self",
        "Casual Bohemian",
        "Athletic & Wellness",
        "Coastal Aesthetics",
      ]

      if (!settings) return null
      if (!Array.isArray(settings)) {
        // Try to parse if it's a string
        if (typeof settings === 'string') {
          try {
            const parsed = JSON.parse(settings)
            if (Array.isArray(parsed)) {
              return sanitizeSettingsPreference(parsed)
            }
          } catch {
            // Not valid JSON, might be a plain string
            const match = validStyles.find((style) => style.toLowerCase() === settings.toLowerCase().trim())
            if (match) {
              return [match]
            }
            return null
          }
        }
        return null
      }
      
      const sanitized = settings
        .filter((s: any) => {
          if (typeof s !== 'string') return false
          // Filter out corrupted data: very long strings or nested JSON patterns
          if (s.length > 100) return false
          if (s.includes('{\\"') || s.includes('\\\\')) return false
          // Only keep valid feed style strings
          return validStyles.some((style) => style.toLowerCase() === s.toLowerCase().trim())
        })
        .map((s: string) => {
          const trimmed = s.trim()
          const match = validStyles.find((style) => style.toLowerCase() === trimmed.toLowerCase())
          return match || trimmed
        })
        // Remove duplicates
        .filter((s: string, index: number, arr: string[]) => arr.indexOf(s) === index)
      
      return sanitized.length > 0 ? sanitized : null
    }

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
            } catch {
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
        } catch {
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
        settingsPreference: sanitizeSettingsPreference(brand.settings_preference) || parseJsonb(brand.settings_preference),
        fashionStyle: parseJsonb(brand.fashion_style, true), // Convert objects to arrays
        feedStyleVariationId: brand.feed_style_variation_id ? Number(brand.feed_style_variation_id) : null,
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
      feedStyleVariationId: body.feedStyleVariationId,
      visualAestheticType: typeof body.visualAesthetic,
      fashionStyleType: typeof body.fashionStyle,
      settingsPreferenceType: typeof body.settingsPreference,
      visualAestheticIsArray: Array.isArray(body.visualAesthetic),
      fashionStyleIsArray: Array.isArray(body.fashionStyle),
      settingsPreferenceIsArray: Array.isArray(body.settingsPreference),
    })


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
      
      // Prepare JSONB fields - handle arrays and strings properly
      const prepareJsonbValue = (value: any, convertObjectToArray: boolean = false): any => {
        if (!value) return null
        if (Array.isArray(value)) {
          return value.length > 0 ? value : null
        }
        if (typeof value === 'string') {
          // If it's already a JSON string, try to parse it
          try {
            const parsed = JSON.parse(value)
            if (convertObjectToArray && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              return Object.keys(parsed)
            }
            return parsed
          } catch {
            // Not valid JSON, return as array with single value
            return [value]
          }
        }
        if (convertObjectToArray && value && typeof value === "object" && !Array.isArray(value)) {
          return Object.keys(value)
        }
        return value
      }
      
      // Sanitize settingsPreference to remove corrupted nested JSON strings
      const sanitizeSettingsPreference = (settings: any): string[] | null => {
        if (!settings) return null
        if (!Array.isArray(settings)) return null
        
        const validStyles = [
          "luxury",
          "minimal",
          "beige",
          "Dark & Moody",
          "Beige Aesthetic",
          "Light & Minimalistic",
          "Luxury Future Self",
          "Casual Bohemian",
          "Athletic & Wellness",
          "Coastal Aesthetics",
        ]
        const sanitized = settings
          .filter((s: any) => {
            if (typeof s !== 'string') return false
            // Filter out corrupted data: very long strings or nested JSON patterns
            if (s.length > 100) return false
            if (s.includes('{\\"') || s.includes('\\\\')) return false
            // Only keep valid feed style strings
            return validStyles.some((style) => style.toLowerCase() === s.toLowerCase().trim())
          })
          .map((s: string) => {
            const trimmed = s.trim()
            const match = validStyles.find((style) => style.toLowerCase() === trimmed.toLowerCase())
            return match || trimmed
          })
          // Remove duplicates
          .filter((s: string, index: number, arr: string[]) => arr.indexOf(s) === index)
        
        return sanitized.length > 0 ? sanitized : null
      }
      
      const visualAestheticJson = prepareJsonbValue(body.visualAesthetic, true)
      const fashionStyleJson = prepareJsonbValue(body.fashionStyle, true)
      const settingsPreferenceJson = sanitizeSettingsPreference(body.settingsPreference) || prepareJsonbValue(body.settingsPreference)
      const contentPillarsJson = prepareJsonbValue(body.contentPillars)
      const hasFeedStyleVariationId = Object.prototype.hasOwnProperty.call(body, "feedStyleVariationId")
      const feedStyleVariationId = hasFeedStyleVariationId && body.feedStyleVariationId !== null && body.feedStyleVariationId !== undefined
        ? Number(body.feedStyleVariationId)
        : null
      
      console.log("[v0] Prepared JSONB values:", {
        visualAestheticJson: visualAestheticJson ? JSON.stringify(visualAestheticJson).substring(0, 100) : null,
        fashionStyleJson: fashionStyleJson ? JSON.stringify(fashionStyleJson).substring(0, 100) : null,
        settingsPreferenceJson: settingsPreferenceJson ? JSON.stringify(settingsPreferenceJson).substring(0, 100) : null,
        contentPillarsJson: contentPillarsJson ? JSON.stringify(contentPillarsJson).substring(0, 100) : null,
      })
      
      // Use COALESCE to only update fields that are provided (not undefined)
      // For JSONB fields, explicitly stringify arrays/objects for Neon compatibility
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
          content_pillars = COALESCE(${contentPillarsJson !== null && contentPillarsJson !== undefined ? JSON.stringify(contentPillarsJson) : null}::jsonb, content_pillars::jsonb),
          visual_aesthetic = COALESCE(${visualAestheticJson !== null && visualAestheticJson !== undefined ? JSON.stringify(visualAestheticJson) : null}::jsonb, visual_aesthetic::jsonb),
          settings_preference = COALESCE(${settingsPreferenceJson !== null && settingsPreferenceJson !== undefined ? JSON.stringify(settingsPreferenceJson) : null}::jsonb, settings_preference::jsonb),
          fashion_style = COALESCE(${fashionStyleJson !== null && fashionStyleJson !== undefined ? JSON.stringify(fashionStyleJson) : null}::jsonb, fashion_style::jsonb),
          feed_style_variation_id = CASE
            WHEN ${hasFeedStyleVariationId} THEN ${Number.isFinite(feedStyleVariationId) ? feedStyleVariationId : null}
            ELSE feed_style_variation_id
          END,
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
      
      // Prepare JSONB fields for INSERT (same logic as UPDATE)
      const prepareJsonbValue = (value: any, convertObjectToArray: boolean = false): any => {
        if (!value) return null
        if (Array.isArray(value)) {
          return value.length > 0 ? value : null
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value)
            if (convertObjectToArray && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              return Object.keys(parsed)
            }
            return parsed
          } catch {
            return [value]
          }
        }
        if (convertObjectToArray && value && typeof value === "object" && !Array.isArray(value)) {
          return Object.keys(value)
        }
        return value
      }
      
      const visualAestheticJson = prepareJsonbValue(body.visualAesthetic, true)
      const fashionStyleJson = prepareJsonbValue(body.fashionStyle, true)
      const settingsPreferenceJson = prepareJsonbValue(body.settingsPreference)
      const contentPillarsJson = prepareJsonbValue(body.contentPillars)
      const feedStyleVariationId = body.feedStyleVariationId !== null && body.feedStyleVariationId !== undefined
        ? Number(body.feedStyleVariationId)
        : null
      
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
          feed_style_variation_id,
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
          ${contentPillarsJson !== null && contentPillarsJson !== undefined ? JSON.stringify(contentPillarsJson) : null}::jsonb,
          ${visualAestheticJson !== null && visualAestheticJson !== undefined ? JSON.stringify(visualAestheticJson) : null}::jsonb,
          ${settingsPreferenceJson !== null && settingsPreferenceJson !== undefined ? JSON.stringify(settingsPreferenceJson) : null}::jsonb,
          ${Number.isFinite(feedStyleVariationId) ? feedStyleVariationId : null},
          ${fashionStyleJson !== null && fashionStyleJson !== undefined ? JSON.stringify(fashionStyleJson) : null}::jsonb,
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
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    const errorCode = error?.code
    const errorDetail = error?.detail || error?.constraint
    
    console.error("[v0] ❌ Error updating personal brand:", {
      message: errorMessage,
      code: errorCode,
      detail: errorDetail,
      stack: error?.stack,
      errorType: error?.constructor?.name,
    })
    
    // Check for specific database errors
    if (errorCode === '23505') { // Unique constraint violation
      return NextResponse.json({ 
        error: "Failed to update personal brand",
        details: "A personal brand already exists for this user",
        code: errorCode,
      }, { status: 409 }) // Conflict
    }
    
    if (errorCode === '23503') { // Foreign key violation
      return NextResponse.json({ 
        error: "Failed to update personal brand",
        details: "Invalid reference in personal brand data",
        code: errorCode,
      }, { status: 400 })
    }
    
    if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
      return NextResponse.json({ 
        error: "Failed to update personal brand",
        details: "Invalid data format. Please try again.",
        code: "INVALID_FORMAT",
      }, { status: 400 })
    }
    
    // Generic error
    return NextResponse.json({ 
      error: "Failed to update personal brand",
      details: errorMessage || "Unknown error occurred",
      code: errorCode || "UNKNOWN_ERROR",
    }, { status: 500 })
  }
}
