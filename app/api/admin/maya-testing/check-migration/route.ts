import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
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

    // Check if testing tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('maya_test_results', 'maya_test_trainings', 'maya_test_images', 'maya_test_comparisons', 'maya_test_configs')
      ORDER BY table_name
    `

    const existingTables = tables.map((t: any) => t.table_name)
    const requiredTables = [
      'maya_test_results',
      'maya_test_trainings', 
      'maya_test_images',
      'maya_test_comparisons',
      'maya_test_configs'
    ]

    const missingTables = requiredTables.filter(t => !existingTables.includes(t))

    return NextResponse.json({
      success: true,
      migration_status: missingTables.length === 0 ? 'complete' : 'pending',
      existing_tables: existingTables,
      missing_tables: missingTables,
      needs_migration: missingTables.length > 0,
    })
  } catch (error: any) {
    console.error("[v0] Error checking migration:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check migration" },
      { status: 500 }
    )
  }
}


























