import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { del } from "@vercel/blob"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const assets = await sql`
      SELECT * FROM brand_assets
      WHERE user_id = ${neonUser.id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ assets })
  } catch (error) {
    console.error("[v0] Error fetching assets:", error)
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { assetId } = await request.json()

    if (!assetId) {
      return NextResponse.json({ error: "No asset ID provided" }, { status: 400 })
    }

    // Get asset to verify ownership and get URL
    const asset = await sql`
      SELECT * FROM brand_assets
      WHERE id = ${assetId} AND user_id = ${neonUser.id}
    `

    if (asset.length === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Delete from Blob storage
    await del(asset[0].file_url)

    // Delete from database
    await sql`
      DELETE FROM brand_assets
      WHERE id = ${assetId} AND user_id = ${neonUser.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
