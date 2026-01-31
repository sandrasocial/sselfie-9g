import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(req: Request) {
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

    const body = await req.json()
    const {
      features_built,
      personal_story,
      struggles,
      wins,
      fun_activities
    } = body

    // Enhance each section with AI
    const enhanced: any = {}

    // Enhance features built
    if (features_built) {
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        prompt: `Transform these product update bullet points into a compelling narrative in Sandra's voice.

Sandra's voice: Warm, empowering, friendly, real. Norwegian English patterns. Mixes vulnerability with strength.

Bullet points:
${features_built}

Transform into 2-3 sentence narrative that's authentic, excited, and shows the work. Keep it conversational and real.`,
      })
      enhanced.features_built_enhanced = text
    }

    // Enhance personal story
    if (personal_story) {
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        prompt: `Transform this into a compelling personal story in Sandra's authentic voice.

Sandra's voice: Warm, empowering, raw, real. Single mom in Norway building AI platform. "Visibility = Financial Freedom" philosophy. Mixes struggle with triumph.

Raw notes:
${personal_story}

Transform into a powerful 3-5 sentence story that's vulnerable, inspiring, and real. Show the messy middle, the breakthrough moment, the human element. This should feel like Sandra talking to a friend.`,
      })
      enhanced.personal_story_enhanced = text
    }

    // Enhance struggles
    if (struggles) {
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        prompt: `Transform these struggles into authentic, relatable narrative.

Sandra's voice: Honest about challenges, doesn't hide imperfection, but empowering.

Struggles:
${struggles}

Transform into 2-3 sentences that normalize the struggle while showing resilience. Make it relatable for other women entrepreneurs. Don't sugar-coat, but don't wallow - show the real human experience.`,
      })
      enhanced.struggles_enhanced = text
    }

    // Enhance wins
    if (wins) {
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        prompt: `Transform these wins into celebratory but grounded narrative.

Sandra's voice: Celebrates wins without arrogance. Shows excitement. Makes it relatable.

Wins:
${wins}

Transform into 2-3 sentences that celebrate authentically. Show the achievement but connect it to the journey. Make others feel "if she can do it, so can I".`,
      })
      enhanced.wins_enhanced = text
    }

    return NextResponse.json({ enhanced })
  } catch (error: any) {
    console.error('[Journal] Error enhancing:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

