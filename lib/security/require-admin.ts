import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

let sql: ReturnType<typeof neon> | null = null

export interface AdminContext {
  authUserId: string
  neonUserId: number
  email: string
}

/**
 * Centralized admin guard for API routes.
 * Usage:
 *   const guard = await requireAdmin(request)
 *   if (guard instanceof NextResponse) return guard
 *   // else guard contains { authUserId, neonUserId, email }
 */
export async function requireAdmin(request?: Request): Promise<NextResponse | AdminContext> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!sql) {
      if (!process.env.DATABASE_URL) {
        return NextResponse.json({ error: "Database not configured" }, { status: 500 })
      }
      sql = neon(process.env.DATABASE_URL)
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin role in DB
    const roleResult = await sql`
      SELECT role, email 
      FROM users 
      WHERE id = ${neonUser.id}
      LIMIT 1
    `

    const role = roleResult?.[0]?.role
    const email = roleResult?.[0]?.email || neonUser.email

    const isAdminByEmail = email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    const isAdminByRole = role === "admin"

    if (!isAdminByEmail && !isAdminByRole) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 })
    }

    return {
      authUserId: authUser.id,
      neonUserId: neonUser.id,
      email,
    }
  } catch (err) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}


