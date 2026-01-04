import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { generateText } from "ai"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { PhotoshootSessionBuilder } from "@/lib/maya/photoshoot-session"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    console.log("[v0] Auto-generating feed concepts after brand profile completion")

    const { user: authUser, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    const brandProfileResult = await sql`
      SELECT * FROM user_personal_brand
      WHERE user_id = ${user.id}
      LIMIT 1
    `

    if (brandProfileResult.length === 0) {
      return NextResponse.json({ error: "Brand profile not found" }, { status: 404 })
    }

    const brandProfile = brandProfileResult[0]

    const authId = user.stack_auth_id || user.supabase_user_id || user.id
    const userContext = await getUserContextForMaya(authId)

    let userGender = "person"
    const userDataResult = await sql`
      SELECT gender FROM users WHERE id = ${user.id} LIMIT 1
    `
    if (userDataResult.length > 0 && userDataResult[0].gender) {
      userGender = userDataResult[0].gender
    }

    console.log("[v0] Generating 9 feed concept cards with photoshoot consistency for:", user.email)

    const { session, concepts: photoshootConcepts } = PhotoshootSessionBuilder.generatePhotoshootSession(
      brandProfile,
      userGender,
      userContext,
    )

    console.log("[v0] Photoshoot session created with base seed:", session.baseSeed)

    // ALWAYS create a NEW feed - never reuse existing feeds
    // This ensures users can have multiple feeds and don't lose their work
    const newFeedResult = await sql`
      INSERT INTO feed_layouts (
        user_id, 
        brand_name, 
        username, 
        description,
        photoshoot_base_seed,
        photoshoot_base_outfit,
        photoshoot_base_location,
        photoshoot_enabled,
        created_by
      )
      VALUES (
        ${user.id},
        ${brandProfile.name || "Personal Brand"},
        ${user.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"},
        ${brandProfile.transformation_story || "Your brand story"},
        ${session.baseSeed},
        ${session.baseOutfit},
        ${session.baseLocation},
        true,
        'maya'
      )
      RETURNING id
    `
    const feedId = newFeedResult[0].id
    console.log("[v0] Created NEW feed layout with photoshoot mode:", feedId)

    const [model] = await sql`
      SELECT trigger_word FROM user_models
      WHERE user_id = ${user.id}
      AND training_status = 'completed'
      AND (is_test = false OR is_test IS NULL)
      ORDER BY created_at DESC
      LIMIT 1
    `

    const triggerWord = model?.trigger_word || "a person"

    for (let i = 0; i < photoshootConcepts.length; i++) {
      const concept = photoshootConcepts[i]
      
      // Build consistent prompt using photoshoot session
      const consistentPrompt = PhotoshootSessionBuilder.buildConsistentPrompt(
        session,
        concept,
        triggerWord,
        userGender,
      )

      await sql`
        INSERT INTO feed_posts (
          feed_layout_id,
          user_id,
          position,
          prompt,
          post_type,
          caption,
          generation_status,
          seed_variation
        )
        VALUES (
          ${feedId},
          ${user.id},
          ${i + 1},
          ${consistentPrompt},
          ${concept.category},
          ${concept.description},
          'pending',
          ${concept.seedVariation}
        )
      `
    }

    console.log("[v0] Successfully created", photoshootConcepts.length, "concept cards with photoshoot consistency")

    return NextResponse.json({
      success: true,
      feedId,
      conceptCount: photoshootConcepts.length,
      message: "Feed concepts generated with photoshoot consistency",
      photoshootSession: {
        baseSeed: session.baseSeed,
        outfit: session.baseOutfit.substring(0, 50) + "...",
        location: session.baseLocation.substring(0, 50) + "...",
      },
    })
  } catch (error) {
    console.error("[v0] Error auto-generating feed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate feed" },
      { status: 500 },
    )
  }
}
