import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/studio-pro/brand-kits
 * Get user's brand kits
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const brandKits = await sql`
      SELECT 
        id,
        name,
        primary_color,
        secondary_color,
        accent_color,
        font_style,
        brand_tone,
        is_default,
        created_at
      FROM brand_kits
      WHERE user_id = ${neonUser.id}
      ORDER BY is_default DESC, created_at DESC
    `

    return NextResponse.json({ brandKits })
  } catch (error) {
    console.error("[STUDIO-PRO] Error fetching brand kits:", error)
    return NextResponse.json(
      { error: "Failed to fetch brand kits" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/studio-pro/brand-kits
 * Create brand kit
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      primaryColor,
      secondaryColor,
      accentColor,
      fontStyle,
      brandTone,
      isDefault,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Brand kit name is required" },
        { status: 400 }
      )
    }

    // Validate brand tone
    if (brandTone) {
      const validTones = ['bold', 'soft', 'minimalist', 'luxury', 'casual', 'professional']
      if (!validTones.includes(brandTone)) {
        return NextResponse.json(
          { error: `Invalid brand tone. Must be one of: ${validTones.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await sql`
        UPDATE brand_kits
        SET is_default = false
        WHERE user_id = ${neonUser.id}
      `
    }

    // Insert new brand kit
    const [inserted] = await sql`
      INSERT INTO brand_kits (
        user_id,
        name,
        primary_color,
        secondary_color,
        accent_color,
        font_style,
        brand_tone,
        is_default
      )
      VALUES (
        ${neonUser.id},
        ${name},
        ${primaryColor || null},
        ${secondaryColor || null},
        ${accentColor || null},
        ${fontStyle || null},
        ${brandTone || null},
        ${isDefault || false}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      brandKit: inserted,
    })
  } catch (error) {
    console.error("[STUDIO-PRO] Error creating brand kit:", error)
    return NextResponse.json(
      { error: "Failed to create brand kit" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/studio-pro/brand-kits
 * Update brand kit
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const {
      id,
      name,
      primaryColor,
      secondaryColor,
      accentColor,
      fontStyle,
      brandTone,
      isDefault,
    } = body

    if (!id) {
      return NextResponse.json(
        { error: "Brand kit ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const [existing] = await sql`
      SELECT * FROM brand_kits
      WHERE id = ${Number(id)} AND user_id = ${neonUser.id}
    `

    if (!existing) {
      return NextResponse.json(
        { error: "Brand kit not found" },
        { status: 404 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await sql`
        UPDATE brand_kits
        SET is_default = false
        WHERE user_id = ${neonUser.id} AND id != ${Number(id)}
      `
    }

    // Update brand kit
    const [updated] = await sql`
      UPDATE brand_kits
      SET
        name = COALESCE(${name || null}, name),
        primary_color = COALESCE(${primaryColor !== undefined ? primaryColor : null}, primary_color),
        secondary_color = COALESCE(${secondaryColor !== undefined ? secondaryColor : null}, secondary_color),
        accent_color = COALESCE(${accentColor !== undefined ? accentColor : null}, accent_color),
        font_style = COALESCE(${fontStyle || null}, font_style),
        brand_tone = COALESCE(${brandTone || null}, brand_tone),
        is_default = COALESCE(${isDefault !== undefined ? isDefault : null}, is_default)
      WHERE id = ${Number(id)} AND user_id = ${neonUser.id}
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      brandKit: updated,
    })
  } catch (error) {
    console.error("[STUDIO-PRO] Error updating brand kit:", error)
    return NextResponse.json(
      { error: "Failed to update brand kit" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/studio-pro/brand-kits
 * Delete brand kit
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const kitId = searchParams.get("id")

    if (!kitId) {
      return NextResponse.json(
        { error: "Brand kit ID required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const [kit] = await sql`
      SELECT * FROM brand_kits
      WHERE id = ${Number(kitId)} AND user_id = ${neonUser.id}
    `

    if (!kit) {
      return NextResponse.json(
        { error: "Brand kit not found" },
        { status: 404 }
      )
    }

    // Delete brand kit (cascade will handle brand_assets references)
    await sql`
      DELETE FROM brand_kits
      WHERE id = ${Number(kitId)} AND user_id = ${neonUser.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[STUDIO-PRO] Error deleting brand kit:", error)
    return NextResponse.json(
      { error: "Failed to delete brand kit" },
      { status: 500 }
    )
  }
}




