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
    const monthlyDrops = await sql`
      SELECT *
      FROM academy_monthly_drops
      ORDER BY created_at DESC, order_index ASC
    `

    return NextResponse.json({ monthlyDrops })
  } catch (error) {
    console.error("[v0] Error fetching monthly drops:", error)
    return NextResponse.json({ error: "Failed to fetch monthly drops" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { title, description, thumbnail_url, resource_type, resource_url, month, category, order_index, status } =
      body

    const result = await sql`
      INSERT INTO academy_monthly_drops (
        title, description, thumbnail_url, resource_type, resource_url, month, category, order_index, status
      )
      VALUES (
        ${title}, ${description}, ${thumbnail_url}, ${resource_type}, ${resource_url}, ${month}, ${category}, ${order_index}, ${status}
      )
      RETURNING *
    `

    return NextResponse.json({ monthlyDrop: result[0] })
  } catch (error) {
    console.error("[v0] Error creating monthly drop:", error)
    return NextResponse.json({ error: "Failed to create monthly drop" }, { status: 500 })
  }
}
