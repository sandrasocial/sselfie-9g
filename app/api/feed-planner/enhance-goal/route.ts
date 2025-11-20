import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"

export async function POST(req: NextRequest) {
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

    const { goalText } = await req.json()

    if (!goalText || goalText.trim().length === 0) {
      return NextResponse.json(
        { error: "Goal text is required" },
        { status: 400 }
      )
    }

    const { text: enhancedGoal } = await generateText({
      model: "anthropic/claude-sonnet-4.5",
      prompt: `You're Maya, a warm and friendly personal branding expert who helps people express themselves authentically.

Someone just wrote this quick note about their Instagram feed goal:
"${goalText}"

Make it better! Rewrite it to be:
- More descriptive and strategic
- Clearer about their brand vision
- More specific about their content themes
- Still authentic to their voice
- 2-3x longer with more detail

Keep it conversational and genuine. Don't make it sound corporate or stuffy.
Just write the enhanced version, no explanations.`,
    })

    return NextResponse.json({ enhancedGoal: enhancedGoal.trim() })
  } catch (error) {
    console.error("[v0] Enhance goal error:", error)
    return NextResponse.json(
      { error: "Failed to enhance goal" },
      { status: 500 }
    )
  }
}
