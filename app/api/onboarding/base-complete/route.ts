import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * API endpoint to save base wizard data (Decision 3 - Phase 3A)
 * Saves only base wizard fields to user_personal_brand table
 * Does NOT set is_completed = true (extensions will come after)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name, businessType, colorTheme, visualAesthetic, currentSituation, customColors } = body

    const normalizeArrayField = (value: unknown): string[] | null => {
      if (Array.isArray(value)) {
        const items = value.map((item) => String(item).trim()).filter(Boolean)
        return items.length > 0 ? items : null
      }
      if (typeof value === "string") {
        return value.trim().length > 0 ? [value.trim()] : null
      }
      if (value && typeof value === "object") {
        const items = Object.keys(value as Record<string, unknown>).map((item) => String(item).trim()).filter(Boolean)
        return items.length > 0 ? items : null
      }
      return null
    }

    const visualAestheticJson = normalizeArrayField(visualAesthetic)
      ? JSON.stringify(normalizeArrayField(visualAesthetic))
      : null

    console.log("[Base Wizard] Saving base wizard data for user:", neonUser.id, {
      name: !!name,
      businessType: !!businessType,
      colorTheme: !!colorTheme,
      hasVisualAesthetic: !!visualAesthetic,
      currentSituation: !!currentSituation,
    })

    // Check if user_personal_brand record exists
    const existingBrand = await sql`
      SELECT id FROM user_personal_brand WHERE user_id = ${neonUser.id} LIMIT 1
    `

    let brandId: number

    if (existingBrand.length > 0) {
      // Update existing record (only base wizard fields)
      console.log("[Base Wizard] Updating existing brand profile:", existingBrand[0].id)
      const result = await sql`
        UPDATE user_personal_brand
        SET
          name = ${name || ""},
          business_type = ${businessType || ""},
          color_theme = ${colorTheme || ""},
          color_palette = ${customColors || null},
          visual_aesthetic = ${visualAestheticJson}::jsonb,
          current_situation = ${currentSituation || ""},
          updated_at = NOW()
        WHERE user_id = ${neonUser.id}
        RETURNING id
      `
      brandId = result[0].id
      console.log("[Base Wizard] ✅ Updated base wizard data:", brandId)
    } else {
      // Create new record (only base wizard fields, is_completed = false)
      console.log("[Base Wizard] Creating new brand profile for user:", neonUser.id)
      const result = await sql`
        INSERT INTO user_personal_brand (
          user_id,
          name,
          business_type,
          color_theme,
          color_palette,
          visual_aesthetic,
          current_situation,
          is_completed,
          created_at,
          updated_at
        ) VALUES (
          ${neonUser.id},
          ${name || ""},
          ${businessType || ""},
          ${colorTheme || ""},
          ${customColors || null},
          ${visualAestheticJson}::jsonb,
          ${currentSituation || ""},
          false,
          NOW(),
          NOW()
        )
        RETURNING id
      `
      brandId = result[0].id
      console.log("[Base Wizard] ✅ Created base wizard data:", brandId)
    }

    return NextResponse.json({
      success: true,
      brandId,
      message: "Base wizard data saved successfully",
    })
  } catch (error) {
    console.error("[Base Wizard] Error saving base wizard data:", error)
    return NextResponse.json({ error: "Failed to save base wizard data" }, { status: 500 })
  }
}
