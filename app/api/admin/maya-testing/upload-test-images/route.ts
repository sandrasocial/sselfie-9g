import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    // Verify admin access
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const testUserId = formData.get("test_user_id") as string
    const files = formData.getAll("images") as File[]

    if (!testUserId) {
      return NextResponse.json({ error: "test_user_id is required" }, { status: 400 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 })
    }

    // Verify test user exists
    const testUser = await sql`
      SELECT id, email FROM users WHERE id = ${testUserId} LIMIT 1
    `

    if (testUser.length === 0) {
      return NextResponse.json({ error: "Test user not found" }, { status: 404 })
    }

    // CRITICAL: Ensure we're NOT uploading to admin user
    const adminUser = await sql`
      SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1
    `

    if (testUserId === adminUser[0]?.id) {
      return NextResponse.json(
        { 
          error: "Cannot upload test images to admin user. Please use the test user created for testing.",
          suggestion: "Use the 'Create Test User' button to create a separate test user."
        },
        { status: 400 }
      )
    }

    const uploadedImages = []

    for (const file of files) {
      // Upload to blob storage with test prefix
      const filename = `testing/${testUserId}/${Date.now()}-${file.name}`
      const blob = await put(filename, file, {
        access: "public",
      })

      // Save to database (these are test images, clearly marked)
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
          ${testUserId},
          ${file.name},
          ${blob.url},
          'completed',
          NOW(),
          NOW()
        )
        RETURNING id, original_url
      `

      uploadedImages.push({
        id: result[0].id,
        url: result[0].original_url,
        filename: file.name,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedImages.length} test images`,
      images: uploadedImages,
      test_user_id: testUserId,
      note: "These images are for testing only and will not affect your production model.",
    })
  } catch (error: any) {
    console.error("[v0] Error uploading test images:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload test images" },
      { status: 500 }
    )
  }
}























