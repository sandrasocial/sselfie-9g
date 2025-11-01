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
    const neonUser = await getUserByAuthId(user.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get personal brand completion status
    const [personalBrand] = await sql`
      SELECT 
        id,
        is_completed,
        name,
        business_type,
        brand_vibe,
        color_theme,
        color_palette,
        visual_aesthetic,
        communication_voice,
        created_at
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!personalBrand) {
      return NextResponse.json({
        isCompleted: false,
        completionPercentage: 0,
        summary: null,
      })
    }

    // Calculate completion percentage based on key fields
    const keyFields = [
      personalBrand.name,
      personalBrand.business_type,
      personalBrand.brand_vibe,
      personalBrand.color_theme,
      personalBrand.visual_aesthetic,
      personalBrand.communication_voice,
    ]

    const completedFields = keyFields.filter((field) => field && field.trim().length > 0).length
    const completionPercentage = Math.round((completedFields / keyFields.length) * 100)

    return NextResponse.json({
      isCompleted: personalBrand.is_completed || false,
      completionPercentage,
      summary: {
        name: personalBrand.name,
        businessType: personalBrand.business_type,
        brandVibe: personalBrand.brand_vibe,
        colorTheme: personalBrand.color_theme,
        colorPalette: personalBrand.color_palette,
        visualAesthetic: personalBrand.visual_aesthetic,
        communicationVoice: personalBrand.communication_voice,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching brand profile status:", error)
    return NextResponse.json({ error: "Failed to fetch brand profile status" }, { status: 500 })
  }
}
