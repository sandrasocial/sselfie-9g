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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ flatlayId: string }> }) {
  console.log("[v0] PATCH /api/admin/academy/flatlay-images/[id] called")

  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    console.log("[v0] Admin access denied")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { title, description, thumbnail_url, resource_type, resource_url, category, order_index, status } = body
    const { flatlayId } = await params

    console.log("[v0] Updating flatlay image:", flatlayId)
    console.log("[v0] Thumbnail URL to save:", thumbnail_url)

    const result = await sql`
      UPDATE academy_flatlay_images
      SET 
        title = ${title},
        description = ${description},
        thumbnail_url = ${thumbnail_url},
        resource_type = ${resource_type},
        resource_url = ${resource_url},
        category = ${category},
        order_index = ${order_index},
        status = ${status},
        updated_at = NOW()
      WHERE id = ${flatlayId}
      RETURNING *
    `

    console.log("[v0] Update successful, result:", result[0])
    return NextResponse.json({ flatlayImage: result[0] })
  } catch (error) {
    console.error("[v0] Error updating flatlay image:", error)
    return NextResponse.json({ error: "Failed to update flatlay image" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ flatlayId: string }> }) {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { flatlayId } = await params

    await sql`
      DELETE FROM academy_flatlay_images
      WHERE id = ${flatlayId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting flatlay image:", error)
    return NextResponse.json({ error: "Failed to delete flatlay image" }, { status: 500 })
  }
}
