import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db/client"

async function ensureColumn(sql: ReturnType<typeof getDb>) {
  try {
    await sql`
      ALTER TABLE user_personal_brand
      ADD COLUMN IF NOT EXISTS feed_planner_quick_start_seen BOOLEAN DEFAULT false
    `
  } catch (error: any) {
    if (error?.code !== "42703") {
      throw error
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()

    try {
      const [row] = (await sql`
        SELECT feed_planner_quick_start_seen as seen
        FROM user_personal_brand
        WHERE user_id = ${user.id}::text
        LIMIT 1
      `) as any[]

      return NextResponse.json({ seen: row?.seen === true })
    } catch (error: any) {
      if (error?.message?.includes("feed_planner_quick_start_seen") || error?.code === "42703") {
        return NextResponse.json({ seen: false })
      }
      throw error
    }
  } catch (error: any) {
    console.error("[Quick Start] Error fetching status:", error)
    return NextResponse.json({ error: "Failed to fetch quick start status" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()
    await ensureColumn(sql)

    const existing = (await sql`
      SELECT id
      FROM user_personal_brand
      WHERE user_id = ${user.id}::text
      LIMIT 1
    `) as any[]

    if (existing.length > 0) {
      await sql`
        UPDATE user_personal_brand
        SET feed_planner_quick_start_seen = true,
            updated_at = NOW()
        WHERE user_id = ${user.id}::text
      `
    } else {
      await sql`
        INSERT INTO user_personal_brand (user_id, feed_planner_quick_start_seen, created_at, updated_at)
        VALUES (${user.id}::text, true, NOW(), NOW())
      `
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Quick Start] Error updating status:", error)
    return NextResponse.json({ error: "Failed to update quick start status" }, { status: 500 })
  }
}
