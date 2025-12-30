import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const ADMIN_EMAIL = "ssa@ssasocial.com"

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

    if (user.email !== ADMIN_EMAIL) {
      return false
    }

    return true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { pillar, outputType, content, hashtags, suggestedDate } = await request.json()

    if (!pillar || !outputType || !content) {
      return NextResponse.json(
        { error: "Missing required fields: pillar, outputType, content" },
        { status: 400 }
      )
    }

    // Get admin user ID
    const adminUser = await sql`
      SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1
    `

    if (!adminUser || adminUser.length === 0) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    const userId = adminUser[0].id

    // Save to a writing assistant outputs table (create if doesn't exist)
    // For now, we'll save to a simple table structure
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS writing_assistant_outputs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          pillar TEXT NOT NULL,
          output_type TEXT NOT NULL,
          content TEXT NOT NULL,
          hashtags TEXT[],
          suggested_date TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    } catch (error) {
      // Table might already exist, continue
      console.log("[v0] Table creation skipped (may already exist)")
    }

    // Insert the content
    await sql`
      INSERT INTO writing_assistant_outputs (
        user_id,
        pillar,
        output_type,
        content,
        hashtags,
        suggested_date
      ) VALUES (
        ${userId},
        ${pillar},
        ${outputType},
        ${content},
        ${hashtags || []},
        ${suggestedDate || null}
      )
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error saving writing assistant output:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save content" },
      { status: 500 }
    )
  }
}
