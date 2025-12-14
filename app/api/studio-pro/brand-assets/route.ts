import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob/client"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/studio-pro/brand-assets
 * Get user's brand assets
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

    const { searchParams } = new URL(request.url)
    const assetType = searchParams.get("type")
    const brandKitId = searchParams.get("brandKitId")

    let query = sql`
      SELECT 
        id,
        asset_type,
        image_url,
        name,
        description,
        brand_kit_id,
        is_active,
        uploaded_at
      FROM brand_assets
      WHERE user_id = ${neonUser.id}
        AND is_active = true
    `

    if (assetType) {
      query = sql`
        ${query}
        AND asset_type = ${assetType}
      `
    }

    if (brandKitId) {
      query = sql`
        ${query}
        AND brand_kit_id = ${Number(brandKitId)}
      `
    }

    query = sql`
      ${query}
      ORDER BY uploaded_at DESC
    `

    const assets = await query

    return NextResponse.json({ assets })
  } catch (error) {
    console.error("[STUDIO-PRO] Error fetching brand assets:", error)
    return NextResponse.json(
      { error: "Failed to fetch brand assets" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/studio-pro/brand-assets
 * Upload brand asset(s)
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

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const assetType = formData.get("assetType") as string || "product"
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const brandKitId = formData.get("brandKitId") as string

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      )
    }

    // Validate asset type
    const validTypes = ['product', 'logo', 'packaging', 'lifestyle']
    if (!validTypes.includes(assetType)) {
      return NextResponse.json(
        { error: `Invalid asset type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const uploadedAssets = []

    for (const file of files) {
      // Upload to Vercel Blob
      const blob = await put(`studio-pro/brand-assets/${neonUser.id}/${Date.now()}-${file.name}`, file, {
        access: "public",
        contentType: file.type,
      })

      // Insert into database
      const [inserted] = await sql`
        INSERT INTO brand_assets (
          user_id,
          asset_type,
          image_url,
          name,
          description,
          brand_kit_id,
          is_active
        )
        VALUES (
          ${neonUser.id},
          ${assetType},
          ${blob.url},
          ${name || null},
          ${description || null},
          ${brandKitId ? Number(brandKitId) : null},
          true
        )
        RETURNING *
      `

      uploadedAssets.push({
        id: inserted.id,
        asset_type: inserted.asset_type,
        image_url: inserted.image_url,
        name: inserted.name,
        description: inserted.description,
        brand_kit_id: inserted.brand_kit_id,
      })
    }

    // Update brand setup status
    await sql`
      INSERT INTO user_pro_setup (user_id, has_completed_brand_setup, updated_at)
      VALUES (${neonUser.id}, true, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        has_completed_brand_setup = true,
        updated_at = NOW()
    `

    return NextResponse.json({
      success: true,
      assets: uploadedAssets,
    })
  } catch (error) {
    console.error("[STUDIO-PRO] Error uploading brand assets:", error)
    return NextResponse.json(
      { error: "Failed to upload brand assets" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/studio-pro/brand-assets
 * Remove brand asset
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
    const assetId = searchParams.get("id")

    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const [asset] = await sql`
      SELECT * FROM brand_assets
      WHERE id = ${Number(assetId)} AND user_id = ${neonUser.id}
    `

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      )
    }

    // Soft delete
    await sql`
      UPDATE brand_assets
      SET is_active = false
      WHERE id = ${Number(assetId)} AND user_id = ${neonUser.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[STUDIO-PRO] Error deleting brand asset:", error)
    return NextResponse.json(
      { error: "Failed to delete brand asset" },
      { status: 500 }
    )
  }
}


