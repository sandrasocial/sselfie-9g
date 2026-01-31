import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { MAYA_SYSTEM_PROMPT_V2 } from "@/lib/feed-planner-v2/maya-prompts"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514"

async function callMaya(prompt: string) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 800,
      temperature: 0.8,
      system: MAYA_SYSTEM_PROMPT_V2,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const text = data?.content?.[0]?.text
  if (!text || typeof text !== "string") {
    throw new Error("No prompt returned from Maya")
  }
  return text.trim()
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const { scene_prompt_id, original_prompt, feed_style_description, position } = body || {}

  if (!original_prompt || !feed_style_description) {
    return NextResponse.json(
      { error: "original_prompt and feed_style_description are required." },
      { status: 400 },
    )
  }

  const variationRequest = `Create a variation of this scene prompt:\n\nOriginal prompt:\n${original_prompt}\n\nFeed style:\n${feed_style_description}\n\nCreate an alternative version that:\n- Maintains the same overall aesthetic and quality\n- Uses a different activity, pose, or location\n- Feels distinct from the original but equally strong\n- Is the same length and detail level (150-200 words)\n- Could work as position ${position || "this position"} in the feed\n\nDo not simply rephrase - create a genuinely different scene that fits the aesthetic.`

  const variation_prompt = await callMaya(variationRequest)

  return NextResponse.json({
    scene_prompt_id,
    variation_prompt,
  })
}
