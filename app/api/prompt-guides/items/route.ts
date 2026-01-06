import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || null

    // Check if user is admin (to show draft guides)
    let isAdmin = false
    try {
      const { user } = await getAuthenticatedUser()
      if (user) {
        const neonUser = await getUserByAuthId(user.id)
        if (neonUser && neonUser.email === ADMIN_EMAIL) {
          isAdmin = true
        }
      }
    } catch (error) {
      // Not authenticated or error - continue as non-admin
      console.log("[PromptGuides] Could not verify admin status, showing only published guides")
    }

    // Fetch all approved prompt guide items
    // For admins: include both published and draft guides
    // For regular users: only published guides
    // If category is provided, filter by it
    let items
    if (category && category !== "all") {
      if (isAdmin) {
        // Admin: show prompts from both published and draft guides
        items = await sql`
          SELECT 
            pgi.id,
            pgi.concept_title,
            pgi.prompt_text,
            pgi.image_url,
            pgi.sort_order,
            pg.category,
            pg.title as guide_title,
            pg.description as guide_description
          FROM prompt_guide_items pgi
          JOIN prompt_guides pg ON pgi.guide_id = pg.id
          WHERE pgi.status = 'approved'
            AND (pg.status = 'published' OR pg.status = 'draft')
            AND LOWER(pg.category) = LOWER(${category})
          ORDER BY pgi.sort_order ASC, pgi.created_at ASC
        `
      } else {
        // Regular user: only published guides
        items = await sql`
          SELECT 
            pgi.id,
            pgi.concept_title,
            pgi.prompt_text,
            pgi.image_url,
            pgi.sort_order,
            pg.category,
            pg.title as guide_title,
            pg.description as guide_description
          FROM prompt_guide_items pgi
          JOIN prompt_guides pg ON pgi.guide_id = pg.id
          WHERE pgi.status = 'approved'
            AND pg.status = 'published'
            AND LOWER(pg.category) = LOWER(${category})
          ORDER BY pgi.sort_order ASC, pgi.created_at ASC
        `
      }
    } else {
      if (isAdmin) {
        // Admin: show prompts from both published and draft guides
        items = await sql`
          SELECT 
            pgi.id,
            pgi.concept_title,
            pgi.prompt_text,
            pgi.image_url,
            pgi.sort_order,
            pg.category,
            pg.title as guide_title,
            pg.description as guide_description
          FROM prompt_guide_items pgi
          JOIN prompt_guides pg ON pgi.guide_id = pg.id
          WHERE pgi.status = 'approved'
            AND (pg.status = 'published' OR pg.status = 'draft')
          ORDER BY pgi.sort_order ASC, pgi.created_at ASC
        `
      } else {
        // Regular user: only published guides
        items = await sql`
          SELECT 
            pgi.id,
            pgi.concept_title,
            pgi.prompt_text,
            pgi.image_url,
            pgi.sort_order,
            pg.category,
            pg.title as guide_title,
            pg.description as guide_description
          FROM prompt_guide_items pgi
          JOIN prompt_guides pg ON pgi.guide_id = pg.id
          WHERE pgi.status = 'approved'
            AND pg.status = 'published'
          ORDER BY pgi.sort_order ASC, pgi.created_at ASC
        `
      }
    }

    // Get unique categories for filter
    // For admins: include categories from both published and draft guides
    // For regular users: only published guides
    let categories
    if (isAdmin) {
      categories = await sql`
        SELECT DISTINCT LOWER(category) as category
        FROM prompt_guides
        WHERE (status = 'published' OR status = 'draft')
          AND category IS NOT NULL
        ORDER BY category
      `
    } else {
      categories = await sql`
        SELECT DISTINCT LOWER(category) as category
        FROM prompt_guides
        WHERE status = 'published'
          AND category IS NOT NULL
        ORDER BY category
      `
    }

    return NextResponse.json({
      items: items || [],
      categories: categories.map((c: any) => c.category) || [],
    })
  } catch (error: any) {
    console.error("[PromptGuides] Error fetching items:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch prompt guide items", items: [], categories: [] },
      { status: 500 }
    )
  }
}

