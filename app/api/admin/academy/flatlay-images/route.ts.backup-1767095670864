import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"

const sql = neon(process.env.DATABASE_URL!)

async function checkAdminAccess() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return false
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return false
    }

    const adminCheck = await sql`
      SELECT role FROM users WHERE id = ${user.id} LIMIT 1
    `

    if (!adminCheck[0] || adminCheck[0].role !== "admin") {
      return false
    }

    return true
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const flatlayImages = await sql`
      SELECT *
      FROM academy_flatlay_images
      ORDER BY order_index ASC, created_at DESC
    `

    return NextResponse.json({ flatlayImages })
  } catch (error) {
    console.error("[v0] Error fetching flatlay images:", error)
    return NextResponse.json({ error: "Failed to fetch flatlay images" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    console.log("[v0] POST /api/admin/academy/flatlay-images called")

    const body = await request.json()
    console.log("[v0] Request body:", JSON.stringify(body, null, 2))

    const { title, description, thumbnail_url, resource_url, resource_type, order_index, status } = body

    const result = await sql`
      INSERT INTO academy_flatlay_images (
        title, description, thumbnail_url, resource_url, resource_type, order_index, status
      )
      VALUES (
        ${title}, ${description}, ${thumbnail_url}, ${resource_url}, 
        ${resource_type || "image"}, ${order_index || 0}, ${status || "published"}
      )
      RETURNING *
    `

    console.log("[v0] Insert successful, result:", result[0])

    return NextResponse.json({ flatlayImage: result[0] })
  } catch (error) {
    console.error("[v0] Error creating flatlay image:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    return NextResponse.json({ error: "Failed to create flatlay image" }, { status: 500 })
  }
}
