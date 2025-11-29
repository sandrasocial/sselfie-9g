import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export async function POST(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const supabase = await createServerClient()

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // Validate MIME type and size (max 10MB)
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"])
    const maxBytes = 10 * 1024 * 1024

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 })
    }
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 })
    }

    const blob = await put(`brand-assets/${neonUser.id}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    })

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
