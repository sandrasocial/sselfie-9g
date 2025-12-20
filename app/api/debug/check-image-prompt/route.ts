import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Missing image URL parameter" },
        { status: 400 }
      )
    }

    console.log("🔍 Searching for image:", imageUrl.substring(0, 80) + "...")

    const result = await sql`
      SELECT 
        id,
        user_id,
        image_url,
        prompt,
        generated_prompt,
        category,
        source,
        created_at
      FROM ai_images
      WHERE image_url = ${imageUrl}
      LIMIT 1
    `

    if (result.length === 0) {
      // Try searching by partial URL
      const filename = imageUrl.split("/").pop()?.split("-")[0] || ""
      if (filename) {
        const partialResult = await sql`
          SELECT 
            id,
            user_id,
            image_url,
            prompt,
            generated_prompt,
            category,
            source,
            created_at
          FROM ai_images
          WHERE image_url LIKE ${`%${filename}%`}
          ORDER BY created_at DESC
          LIMIT 5
        `

        if (partialResult.length > 0) {
          return NextResponse.json({
            found: false,
            exactMatch: false,
            similarImages: partialResult,
            message: `No exact match found, but found ${partialResult.length} similar images`,
          })
        }
      }

      return NextResponse.json({
        found: false,
        exactMatch: false,
        message: "Image not found in database",
      })
    }

    const image = result[0] as any

    return NextResponse.json({
      found: true,
      exactMatch: true,
      image: {
        id: image.id,
        user_id: image.user_id,
        category: image.category,
        source: image.source,
        created_at: image.created_at,
        prompt: image.prompt,
        generated_prompt: image.generated_prompt,
      },
    })
  } catch (error: any) {
    console.error("❌ Error querying database:", error)
    return NextResponse.json(
      { error: "Failed to query database", details: error.message },
      { status: 500 }
    )
  }
}


























