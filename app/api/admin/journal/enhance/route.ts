import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import Anthropic from '@anthropic-ai/sdk'

const ADMIN_EMAIL = "ssa@ssasocial.com"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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
      future_self_vision
    } = body

    const enhanced: any = {}

    // Enhance each field that has content
    if (features_built) {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Enhance this text about features built. Keep it authentic and in Sandra's voice - don't make it too polished or corporate. Just make it flow better while keeping the raw, honest tone:\n\n${features_built}`
        }]
      })
      enhanced.features_built_enhanced = response.content[0].type === 'text' ? response.content[0].text : features_built
    }

    if (personal_story) {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Enhance this personal story. Keep Sandra's authentic, raw, honest voice. Don't polish away the emotion or realness. Just make it flow better and be more engaging:\n\n${personal_story}`
        }]
      })
      enhanced.personal_story_enhanced = response.content[0].type === 'text' ? response.content[0].text : personal_story
    }

    if (struggles) {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Enhance this list of struggles. Keep it authentic and vulnerable - don't make it too polished. Just make it flow better while maintaining the raw honesty:\n\n${struggles}`
        }]
      })
      enhanced.struggles_enhanced = response.content[0].type === 'text' ? response.content[0].text : struggles
    }

    if (wins) {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Enhance this list of wins. Keep it celebratory and authentic - don't make it too corporate or polished. Just make it flow better and be more engaging:\n\n${wins}`
        }]
      })
      enhanced.wins_enhanced = response.content[0].type === 'text' ? response.content[0].text : wins
    }

    if (future_self_vision) {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Enhance this future vision. Keep it inspiring and authentic to Sandra's voice. Don't make it too corporate or polished. Just make it flow better and be more compelling:\n\n${future_self_vision}`
        }]
      })
      enhanced.future_self_vision_enhanced = response.content[0].type === 'text' ? response.content[0].text : future_self_vision
    }

    return NextResponse.json({ 
      success: true, 
      enhanced 
    })
  } catch (error: any) {
    console.error('[Journal] Error enhancing:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

