import { NextResponse } from "next/server"

import { sql } from "@/lib/neon"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import {
  isWelcomeFlowEnabled,
  shouldShowWelcomeFirstGenerationFlow,
} from "@/lib/onboarding/welcome-first-generation"

export async function GET() {
  try {
    const enabled = isWelcomeFlowEnabled(process.env.FEATURE_NEW_WELCOME_FLOW)
    if (!enabled) {
      return NextResponse.json({ enabled: false, eligible: false })
    }

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ enabled, eligible: false }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser?.id) {
      return NextResponse.json({ enabled, eligible: false }, { status: 404 })
    }

    const [userRow, generationRow] = await Promise.all([
      sql`
        SELECT created_at
        FROM users
        WHERE id = ${neonUser.id}
        LIMIT 1
      `,
      sql`
        SELECT
          EXISTS(
            SELECT 1
            FROM generated_images gi
            WHERE gi.user_id = ${neonUser.id}
          ) AS has_generated_images,
          EXISTS(
            SELECT 1
            FROM ai_images ai
            WHERE ai.user_id = ${neonUser.id}
              AND (
                (ai.image_url IS NOT NULL AND ai.image_url <> '')
                OR ai.generation_status IN ('completed', 'succeeded', 'ready')
              )
          ) AS has_ai_images
      `,
    ])

    const userCreatedAt = userRow?.[0]?.created_at ?? null
    const hasAnyGeneration = Boolean(generationRow?.[0]?.has_generated_images || generationRow?.[0]?.has_ai_images)

    const eligible = shouldShowWelcomeFirstGenerationFlow({
      enabled,
      userCreatedAt,
      hasAnyGeneration,
    })

    return NextResponse.json({
      enabled,
      eligible,
      userCreatedAt,
      hasAnyGeneration,
    })
  } catch (error) {
    console.error("[welcome-first-generation-state] failed:", error)
    return NextResponse.json({ enabled: false, eligible: false }, { status: 500 })
  }
}

