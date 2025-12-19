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

    const { guideId, slug, welcomeMessage, emailListTag, upsellLink, upsellText } = await request.json()

    if (!guideId || !slug || !welcomeMessage) {
      return NextResponse.json(
        { error: "Missing required fields: guideId, slug, welcomeMessage" },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingPage = await sql`
      SELECT id FROM prompt_pages WHERE slug = ${slug} LIMIT 1
    `

    if (existingPage.length > 0) {
      return NextResponse.json(
        { error: "Slug already exists. Please choose a different one." },
        { status: 400 }
      )
    }

    // Get guide title for the page
    const guide = await sql`
      SELECT title FROM prompt_guides WHERE id = ${guideId} LIMIT 1
    `

    if (guide.length === 0) {
      return NextResponse.json(
        { error: "Guide not found" },
        { status: 404 }
      )
    }

    // Create prompt_pages record
    const pageResult = await sql`
      INSERT INTO prompt_pages (
        guide_id,
        slug,
        title,
        welcome_message,
        email_list_tag,
        upsell_link,
        upsell_text,
        status,
        published_at
      ) VALUES (
        ${guideId},
        ${slug},
        ${guide[0].title},
        ${welcomeMessage},
        ${emailListTag || null},
        ${upsellLink || null},
        ${upsellText || null},
        'published',
        NOW()
      )
      RETURNING *
    `

    // Update guide status to published
    await sql`
      UPDATE prompt_guides
      SET status = 'published',
          published_at = NOW()
      WHERE id = ${guideId}
    `

    const publicUrl = `https://sselfie.ai/prompt-guides/${slug}`

    return NextResponse.json({
      success: true,
      page: pageResult[0],
      publicUrl
    })
  } catch (error: any) {
    console.error("[v0] Error publishing prompt guide:", error)
    return NextResponse.json(
      { error: error.message || "Failed to publish guide" },
      { status: 500 }
    )
  }
}
