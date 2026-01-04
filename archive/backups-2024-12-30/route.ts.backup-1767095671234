import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { feedId: string } }) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { feedId } = params
    const body = await request.json()
    const { highlightIndex, imageUrl, title, description } = body

    if (!imageUrl || !imageUrl.startsWith("data:")) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 })
    }

    console.log("[v0] Saving highlight image to Vercel Blob...")

    // Convert data URL to blob
    const base64Data = imageUrl.split(",")[1]
    const buffer = Buffer.from(base64Data, "base64")
    const blob = new Blob([buffer], { type: "image/png" })

    // Upload to Vercel Blob
    const { url } = await put(`highlights/${feedId}-${highlightIndex}-${Date.now()}.png`, blob, {
      access: "public",
      addRandomSuffix: false,
    })

    console.log("[v0] Highlight image uploaded to Blob:", url)

    // Update or insert highlight in database
    const existingHighlights = await sql`
      SELECT * FROM instagram_highlights
      WHERE feed_layout_id = ${feedId} AND user_id = ${neonUser.id}
      ORDER BY created_at ASC
    `

    if (existingHighlights[highlightIndex]) {
      // Update existing highlight
      await sql`
        UPDATE instagram_highlights
        SET image_url = ${url}, title = ${title}, prompt = ${description}, updated_at = NOW()
        WHERE id = ${existingHighlights[highlightIndex].id}
      `
      console.log("[v0] Updated existing highlight in database")
    } else {
      // Insert new highlight
      await sql`
        INSERT INTO instagram_highlights (feed_layout_id, user_id, title, image_url, prompt, generation_status)
        VALUES (${feedId}, ${neonUser.id}, ${title}, ${url}, ${description}, 'completed')
      `
      console.log("[v0] Inserted new highlight in database")
    }

    // Also save to ai_images table for gallery
    await sql`
      INSERT INTO ai_images (user_id, image_url, category, prompt, generation_status, is_favorite)
      VALUES (${neonUser.id}, ${url}, 'highlight', ${description || title}, 'completed', false)
    `

    console.log("[v0] Highlight image saved successfully")

    return NextResponse.json({ success: true, imageUrl: url })
  } catch (error) {
    console.error("[v0] Error saving highlight image:", error)
    return NextResponse.json({ error: "Failed to save highlight image" }, { status: 500 })
  }
}
