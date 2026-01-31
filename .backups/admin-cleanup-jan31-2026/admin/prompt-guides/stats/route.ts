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

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get total guides
    const totalGuidesResult = await sql`
      SELECT COUNT(*) as count FROM prompt_guides
    `
    const totalGuides = parseInt(totalGuidesResult[0]?.count || "0")

    // Get total prompts
    const totalPromptsResult = await sql`
      SELECT COUNT(*) as count FROM prompt_guide_items
    `
    const totalPrompts = parseInt(totalPromptsResult[0]?.count || "0")

    // Get total published pages
    const totalPublishedPagesResult = await sql`
      SELECT COUNT(*) as count FROM prompt_pages WHERE status = 'published'
    `
    const totalPublishedPages = parseInt(totalPublishedPagesResult[0]?.count || "0")

    // Get total email captures (sum from all pages)
    const totalEmailCapturesResult = await sql`
      SELECT COALESCE(SUM(email_capture_count), 0) as total FROM prompt_pages
    `
    const totalEmailCaptures = parseInt(totalEmailCapturesResult[0]?.total || "0")

    return NextResponse.json({
      totalGuides,
      totalPrompts,
      totalPublishedPages,
      totalEmailCaptures
    })
  } catch (error: any) {
    console.error("[v0] Error fetching prompt guides stats:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
