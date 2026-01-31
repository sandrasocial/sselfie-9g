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

    const { guideId, slug, title, welcomeMessage, emailListTag, upsellLink, upsellText } = await request.json()

    if (!guideId || !slug || !title || !welcomeMessage) {
      return NextResponse.json(
        { error: "Missing required fields: guideId, slug, title, welcomeMessage" },
        { status: 400 }
      )
    }

    // Validate guide exists and is ready to publish
    const guideResult = await sql`
      SELECT * FROM prompt_guides
      WHERE id = ${guideId}
    `

    if (guideResult.length === 0) {
      return NextResponse.json(
        { error: "Guide not found" },
        { status: 404 }
      )
    }

    const guide = guideResult[0]

    // Validate guide has at least 5 approved prompts
    if (guide.total_approved < 5) {
      return NextResponse.json(
        { error: "Need at least 5 approved prompts to publish" },
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
        ${title},
        ${welcomeMessage},
        ${emailListTag || null},
        ${upsellLink || null},
        ${upsellText || null},
        'published',
        NOW()
      )
      RETURNING id, slug
    `

    if (pageResult.length === 0) {
      throw new Error("Failed to create prompt page")
    }

    const page = pageResult[0]

    // Update guide status to published
    await sql`
      UPDATE prompt_guides
      SET status = 'published',
          published_at = NOW()
      WHERE id = ${guideId}
    `

    const publicUrl = `https://sselfie.ai/prompt-guides/${page.slug}`

    return NextResponse.json({
      success: true,
      slug: page.slug,
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
