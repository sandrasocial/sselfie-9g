import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { feedId: string } }) {
  try {
    // 1. Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 3. Parse form data
    const formData = await request.formData()
    const image = formData.get("image") as File

    if (!image) {
      return NextResponse.json({ error: "Missing image file" }, { status: 400 })
    }

    // 4. Upload to Vercel Blob
    const blob = await put(`profile-${params.feedId}-${Date.now()}.${image.name.split(".").pop()}`, image, {
      access: "public",
    })

    // 5. Update feed layout with new profile image URL
    const [updatedFeed] = await sql`
      UPDATE feed_layouts
      SET 
        profile_image_url = ${blob.url},
        updated_at = NOW()
      WHERE id = ${params.feedId}
        AND user_id = ${neonUser.id}
      RETURNING *
    `

    if (!updatedFeed) {
      return NextResponse.json({ error: "Feed not found or unauthorized" }, { status: 404 })
    }

    // 6. Also save to ai_images gallery
    await sql`
      INSERT INTO ai_images (
        user_id,
        image_url,
        prompt,
        category,
        source,
        created_at
      )
      VALUES (
        ${neonUser.id},
        ${blob.url},
        'Profile image upload',
        'profile',
        'upload',
        NOW()
      )
    `

    console.log("[v0] Profile image uploaded successfully:", {
      feedId: params.feedId,
      imageUrl: blob.url,
    })

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
    })
  } catch (error) {
    console.error("[v0] Error uploading profile image:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
