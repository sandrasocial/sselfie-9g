import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log("[v0] Creating admin_alert_sent table...")

    // Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_alert_sent (
        id SERIAL PRIMARY KEY,
        alert_id VARCHAR(100) NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        alert_data JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    console.log("[v0] ✓ Created admin_alert_sent table")

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_alert_sent_alert_id 
      ON admin_alert_sent(alert_id)
    `
    console.log("[v0] ✓ Created index on alert_id")

    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_alert_sent_sent_at 
      ON admin_alert_sent(sent_at DESC)
    `
    console.log("[v0] ✓ Created index on sent_at")

    // Verify the table was created
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'admin_alert_sent'
    `

    if (result.length > 0) {
      return NextResponse.json({
        success: true,
        message: "admin_alert_sent table created successfully",
        tableExists: true,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: "Table creation may have failed",
        tableExists: false,
      })
    }
  } catch (error: any) {
    // Ignore "already exists" errors
    if (
      error?.message?.includes("already exists") ||
      error?.code === "42P07" ||
      error?.code === "23505"
    ) {
      return NextResponse.json({
        success: true,
        message: "Table/index already exists",
        tableExists: true,
      })
    }

    console.error("[v0] ❌ Error creating table:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create table",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
