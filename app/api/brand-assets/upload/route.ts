import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const description = formData.get("description") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Upload to Vercel Blob with user-specific path
    const blob = await put(`brand-assets/${neonUser.id}/${file.name}`, file, {
      access: "public",
    })

    // Save to database
    const result = await sql`
      INSERT INTO brand_assets (user_id, file_name, file_url, file_type, file_size, description)
      VALUES (${neonUser.id}, ${file.name}, ${blob.url}, ${file.type}, ${file.size}, ${description})
      RETURNING *
    `

    return NextResponse.json({
      asset: result[0],
      message: "File uploaded successfully",
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
