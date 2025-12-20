import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob/client"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/studio-pro/avatar
 * Get user's avatar images
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

    const avatarImages = await sql`
      SELECT 
        id,
        image_url,
        image_type,
        is_active,
        display_order,
        uploaded_at
      FROM user_avatar_images
      WHERE user_id = ${neonUser.id}
        AND is_active = true
      ORDER BY display_order ASC, uploaded_at ASC
    `

    return NextResponse.json({ images: avatarImages })
  } catch (error) {
    console.error("[STUDIO-PRO] Error fetching avatar images:", error)
    return NextResponse.json(
      { error: "Failed to fetch avatar images" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/studio-pro/avatar
 * Upload avatar image(s)
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

    // Check current count
    const currentCount = await sql`
      SELECT COUNT(*) as count
      FROM user_avatar_images
      WHERE user_id = ${neonUser.id} AND is_active = true
    `

    const count = Number(currentCount[0]?.count || 0)

    // Guardrail: Maximum 8 images
    if (count >= 8) {
      return NextResponse.json(
        { error: "Maximum 8 avatar images allowed. Please remove one before adding more." },
        { status: 400 }
      )
    }

    // Check if this is a JSON request (for gallery images) or FormData (for uploads)
    const contentType = request.headers.get("content-type") || ""
    let files: File[] = []
    let imageType = "casual"
    let imageUrl: string | null = null

    // Try to parse as JSON first (for gallery images)
    if (contentType.includes("application/json")) {
      try {
        const body = await request.json()
        imageUrl = body.imageUrl
        imageType = body.imageType || "casual"

        if (!imageUrl) {
          return NextResponse.json(
            { error: "Image URL required" },
            { status: 400 }
          )
        }
      } catch (error: any) {
        console.error("[STUDIO-PRO] Error parsing JSON:", error)
        return NextResponse.json(
          { error: "Invalid JSON request: " + (error.message || "Unknown error") },
          { status: 400 }
        )
      }
    } else {
      // FormData request for file uploads
      // Check if content type is form-data compatible
      if (!contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded") && contentType !== "") {
        return NextResponse.json(
          { error: "Invalid content type. Use multipart/form-data for file uploads or application/json for gallery images." },
          { status: 400 }
        )
      }

      try {
        const formData = await request.formData()
        files = formData.getAll("files") as File[]
        imageType = (formData.get("imageType") as string) || "casual"

        if (!files || files.length === 0) {
          return NextResponse.json(
            { error: "No files provided" },
            { status: 400 }
          )
        }
      } catch (error: any) {
        console.error("[STUDIO-PRO] Error parsing form data:", error)
        return NextResponse.json(
          { error: "Invalid form data: " + (error.message || "Unknown error") },
          { status: 400 }
        )
      }
    }

    const uploadedImages = []

    if (imageUrl) {
      // Handle gallery image (just save URL, no upload needed)
      if (count >= 8) {
        return NextResponse.json(
          { error: "Maximum 8 avatar images allowed" },
          { status: 400 }
        )
      }

      const [inserted] = await sql`
        INSERT INTO user_avatar_images (
          user_id,
          image_url,
          image_type,
          display_order,
          is_active
        )
        VALUES (
          ${neonUser.id},
          ${imageUrl},
          ${imageType},
          ${count},
          true
        )
        RETURNING *
      `

      uploadedImages.push({
        id: inserted.id,
        image_url: inserted.image_url,
        image_type: inserted.image_type,
        display_order: inserted.display_order,
      })
    } else {
      // Handle file uploads
      // Guardrail: Don't exceed 8 total
      if (count + files.length > 8) {
        return NextResponse.json(
          { error: `You can only upload ${8 - count} more image(s) (maximum 8 total)` },
          { status: 400 }
        )
      }

      for (const file of files) {
        // Upload to Vercel Blob
        const blob = await put(`studio-pro/avatar/${neonUser.id}/${Date.now()}-${file.name}`, file, {
          access: "public",
          contentType: file.type,
        })

        // Insert into database
        const [inserted] = await sql`
          INSERT INTO user_avatar_images (
            user_id,
            image_url,
            image_type,
            display_order,
            is_active
          )
          VALUES (
            ${neonUser.id},
            ${blob.url},
            ${imageType},
            ${count + uploadedImages.length},
            true
          )
          RETURNING *
        `

        uploadedImages.push({
          id: inserted.id,
          image_url: inserted.image_url,
          image_type: inserted.image_type,
          display_order: inserted.display_order,
        })
      }
    }

    // Update setup status if this is first upload
    if (count === 0 && uploadedImages.length >= 3) {
      await sql`
        INSERT INTO user_pro_setup (user_id, has_completed_avatar_setup, updated_at)
        VALUES (${neonUser.id}, true, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          has_completed_avatar_setup = true,
          updated_at = NOW()
      `
    }

    return NextResponse.json({
      success: true,
      images: uploadedImages,
      totalCount: count + uploadedImages.length,
    })
  } catch (error) {
    console.error("[STUDIO-PRO] Error uploading avatar images:", error)
    return NextResponse.json(
      { error: "Failed to upload avatar images" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/studio-pro/avatar
 * Remove avatar image
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
    const imageId = searchParams.get("id")

    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const [image] = await sql`
      SELECT * FROM user_avatar_images
      WHERE id = ${Number(imageId)} AND user_id = ${neonUser.id}
    `

    if (!image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      )
    }

    // Soft delete (set is_active = false)
    await sql`
      UPDATE user_avatar_images
      SET is_active = false
      WHERE id = ${Number(imageId)} AND user_id = ${neonUser.id}
    `

    // Check if user still has minimum 3 images
    const remainingCount = await sql`
      SELECT COUNT(*) as count
      FROM user_avatar_images
      WHERE user_id = ${neonUser.id} AND is_active = true
    `

    const count = Number(remainingCount[0]?.count || 0)

    // Update setup status if below minimum
    if (count < 3) {
      await sql`
        UPDATE user_pro_setup
        SET has_completed_avatar_setup = false
        WHERE user_id = ${neonUser.id}
      `
    }

    return NextResponse.json({ success: true, remainingCount: count })
  } catch (error) {
    console.error("[STUDIO-PRO] Error deleting avatar image:", error)
    return NextResponse.json(
      { error: "Failed to delete avatar image" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/studio-pro/avatar
 * Update display order
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
    const { imageIds } = body // Array of image IDs in desired order

    if (!Array.isArray(imageIds)) {
      return NextResponse.json(
        { error: "imageIds must be an array" },
        { status: 400 }
      )
    }

    // Update display order for each image
    for (let i = 0; i < imageIds.length; i++) {
      await sql`
        UPDATE user_avatar_images
        SET display_order = ${i}
        WHERE id = ${Number(imageIds[i])} AND user_id = ${neonUser.id}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[STUDIO-PRO] Error updating avatar order:", error)
    return NextResponse.json(
      { error: "Failed to update avatar order" },
      { status: 500 }
    )
  }
}




















