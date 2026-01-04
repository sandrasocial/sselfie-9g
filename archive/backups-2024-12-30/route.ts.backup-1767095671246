import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateInstagramBio } from "@/lib/instagram-bio-strategist/bio-logic"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Resolve params (Next.js 16 pattern)
    const resolvedParams = await Promise.resolve(params)
    const feedId = resolvedParams.feedId

    if (!feedId || feedId === "null" || feedId === "undefined") {
      return NextResponse.json({ error: "Invalid feed ID" }, { status: 400 })
    }

    const feedIdInt = Number.parseInt(feedId, 10)

    // Verify feed ownership
    const [feedLayout] = await sql`
      SELECT 
        fl.id,
        fl.user_id,
        fl.brand_vibe,
        fl.business_type,
        fl.color_palette
      FROM feed_layouts fl
      WHERE fl.id = ${feedIdInt}
      AND fl.user_id = ${neonUser.id}
      LIMIT 1
    `

    if (!feedLayout) {
      return NextResponse.json({ error: "Feed not found or unauthorized" }, { status: 404 })
    }

    // Get user's brand profile
    const [brandProfile] = await sql`
      SELECT 
        brand_voice,
        brand_vibe,
        business_type,
        target_audience,
        content_pillars,
        business_goals
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      AND is_completed = true
      LIMIT 1
    `

    if (!brandProfile) {
      return NextResponse.json(
        { error: "Please complete your personal brand profile first" },
        { status: 400 }
      )
    }

    // Get research data if available (optional) - skip if column doesn't exist
    let researchData = null
    // Research data is optional, so we'll just skip it if there's any issue

    console.log("[v0] [GENERATE-BIO] Generating bio with params:", {
      userId: neonUser.id.toString(),
      businessType: brandProfile.business_type || feedLayout.business_type || "creator",
      brandVibe: brandProfile.brand_vibe || feedLayout.brand_vibe || "authentic",
      brandVoice: brandProfile.brand_voice || "authentic and relatable",
      targetAudience: brandProfile.target_audience || "general audience",
      hasResearchData: !!researchData,
    })

    // Generate bio using the existing bio generation logic
    let bioResult
    try {
      bioResult = await generateInstagramBio({
        userId: neonUser.id.toString(),
        businessType: brandProfile.business_type || feedLayout.business_type || "creator",
        brandVibe: brandProfile.brand_vibe || feedLayout.brand_vibe || "authentic",
        brandVoice: brandProfile.brand_voice || "authentic and relatable",
        targetAudience: brandProfile.target_audience || "general audience",
        businessGoals: brandProfile.business_goals || null,
        researchData: researchData || null,
      })
      console.log("[v0] [GENERATE-BIO] Bio generation result:", {
        success: bioResult.success,
        hasBio: !!bioResult.bio,
        error: bioResult.error,
      })
    } catch (error) {
      console.error("[v0] [GENERATE-BIO] Error calling generateInstagramBio:", error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to generate bio" },
        { status: 500 }
      )
    }

    if (!bioResult.success || !bioResult.bio) {
      console.error("[v0] [GENERATE-BIO] Bio generation failed:", {
        success: bioResult.success,
        error: bioResult.error,
        bio: bioResult.bio,
      })
      return NextResponse.json(
        { error: bioResult.error || "Failed to generate bio. Please try again." },
        { status: 500 }
      )
    }

    // Save or update bio in database
    // Check if feed_layout_id column exists by trying to query it
    let existingBio: any = null
    try {
      const result = await sql`
        SELECT id FROM instagram_bios
        WHERE feed_layout_id = ${feedIdInt}
        LIMIT 1
      `
      existingBio = result[0] || null
    } catch (error: any) {
      // If feed_layout_id doesn't exist, try querying by user_id only
      console.log("[v0] [GENERATE-BIO] feed_layout_id column may not exist, trying user_id query")
      try {
        const result = await sql`
          SELECT id FROM instagram_bios
          WHERE user_id = ${neonUser.id}
          ORDER BY created_at DESC
          LIMIT 1
        `
        existingBio = result[0] || null
      } catch (err) {
        console.log("[v0] [GENERATE-BIO] Could not find existing bio, will create new one")
      }
    }

    if (existingBio) {
      // Update existing bio
      await sql`
        UPDATE instagram_bios
        SET bio_text = ${bioResult.bio}
        WHERE id = ${existingBio.id}
      `
      console.log("[v0] [GENERATE-BIO] Updated existing bio:", existingBio.id)
    } else {
      // Create new bio - try with feed_layout_id first, fallback to user_id only
      try {
        await sql`
          INSERT INTO instagram_bios (feed_layout_id, user_id, bio_text, created_at)
          VALUES (${feedIdInt}, ${neonUser.id}, ${bioResult.bio}, NOW())
        `
        console.log("[v0] [GENERATE-BIO] Created new bio with feed_layout_id")
      } catch (error: any) {
        // If feed_layout_id doesn't exist, insert without it
        if (error.message?.includes("feed_layout_id") || error.code === "42703") {
          console.log("[v0] [GENERATE-BIO] feed_layout_id column doesn't exist, inserting without it")
          await sql`
            INSERT INTO instagram_bios (user_id, bio_text, created_at)
            VALUES (${neonUser.id}, ${bioResult.bio}, NOW())
          `
        } else {
          throw error
        }
      }
    }

    return NextResponse.json({
      success: true,
      bio: bioResult.bio,
    })
  } catch (error) {
    console.error("[v0] Generate bio error:", error)
    return NextResponse.json({ error: "Failed to generate bio" }, { status: 500 })
  }
}
