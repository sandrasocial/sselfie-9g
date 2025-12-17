import { NextResponse } from "next/server"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getEffectiveNeonUser(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { imageUrls } = await request.json()

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: "No image URLs provided" }, { status: 400 })
    }

    // Save all uploaded images to database
    const insertPromises = imageUrls.map((url: string) => {
      const filename = url.split("/").pop() || "unknown"
      return sql`
        INSERT INTO selfie_uploads (user_id, filename, original_url, processing_status, created_at, updated_at)
        VALUES (${user.id}, ${filename}, ${url}, 'pending', NOW(), NOW())
        RETURNING *
      `
    })

    await Promise.all(insertPromises)

    return NextResponse.json({
      success: true,
      count: imageUrls.length,
    })
  } catch (error) {
    console.error("Error saving training images:", error)
    return NextResponse.json({ error: "Failed to save training images" }, { status: 500 })
  }
}
