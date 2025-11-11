import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { put } from "@vercel/blob"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let formData
    try {
      formData = await request.formData()
    } catch (error: any) {
      console.error("[v0] Error parsing formData:", error)

      if (
        error.message?.includes("disturbed") ||
        error.message?.includes("locked") ||
        error.message?.includes("already been consumed")
      ) {
        return NextResponse.json(
          {
            error: "Upload failed",
            details: "The request body was already read. Please refresh the page and try again.",
          },
          { status: 400 },
        )
      }

      return NextResponse.json({ error: "Failed to parse upload" }, { status: 400 })
    }

    const file = formData.get("image") as File

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    console.log(`[v0] Uploading training image ${file.name} for user ${neonUser.id}`)

    // Upload image to blob storage
    const blob = await put(`training/${neonUser.id}/${Date.now()}-${file.name}`, file, {
      access: "public",
    })

    console.log(`[v0] Successfully uploaded image to blob storage: ${blob.url}`)

    // Save to database
    const result = await sql`
      INSERT INTO selfie_uploads (
        user_id,
        filename,
        original_url,
        processing_status,
        created_at,
        updated_at
      )
      VALUES (
        ${neonUser.id},
        ${file.name},
        ${blob.url},
        'completed',
        NOW(),
        NOW()
      )
      RETURNING *
    `

    console.log(`[v0] Saved image to database with id: ${result[0].id}`)

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
      savedImage: result[0],
    })
  } catch (error) {
    console.error("[v0] Error uploading training image:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}
