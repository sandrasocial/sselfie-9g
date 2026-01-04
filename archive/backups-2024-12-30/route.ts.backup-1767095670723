import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { imageIds } = await request.json()

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({ error: "Image IDs are required" }, { status: 400 })
    }

    const userId = neonUser.id.toString()
    let savedCount = 0

    // Process each image ID
    for (const imageId of imageIds) {
      const imageIdStr = String(imageId)
      const isAiImage = imageIdStr.startsWith("ai_")
      const numericId = isAiImage
        ? Number.parseInt(imageIdStr.replace("ai_", ""))
        : Number.parseInt(imageIdStr.replace("gen_", ""))

      if (isAiImage) {
        // Update ai_images table
        const result = await sql`
          UPDATE ai_images
          SET saved = true
          WHERE id = ${numericId} AND user_id = ${userId}
          RETURNING id
        `
        if (result.length > 0) {
          savedCount++
        }
      } else {
        // Update generated_images table
        const result = await sql`
          UPDATE generated_images
          SET saved = true
          WHERE id = ${numericId} AND user_id = ${userId}
          RETURNING id
        `
        if (result.length > 0) {
          savedCount++
        }
      }
    }

    console.log(`[v0] Bulk save: ${savedCount} of ${imageIds.length} images saved`)

    return NextResponse.json({ success: true, savedCount, total: imageIds.length })
  } catch (error) {
    console.error("[v0] Error bulk saving images:", error)
    return NextResponse.json(
      {
        error: "Failed to save images",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
