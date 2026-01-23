import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { MAYA_SYSTEM_PROMPT_V2, POSITION_GUIDANCE } from "@/lib/feed-planner-v2/maya-prompts"

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
      max_tokens: 1200,
      temperature: 0.7,
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

async function callMayaJson(prompt: string) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1200,
      temperature: 0.2,
      system:
        "You are a precise JSON formatter. Return only valid JSON with no commentary or markdown.",
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
    throw new Error("No JSON returned from Maya")
  }
  return text.trim()
}

function extractFramesFromPreview(previewPromptText: string): string[] {
  const framesByBracket = Array.from(previewPromptText.matchAll(/\[(\d)\]\s*([^\n|]+)/g)).map(
    (match) => {
      const index = Number(match[1])
      const text = (match[2] || "").trim()
      return { index, text }
    }
  )

  const framesByNumber = Array.from(previewPromptText.matchAll(/(?:^|\n)\s*(\d)[\.\)]\s+([^\n]+)/g)).map(
    (match) => {
      const index = Number(match[1])
      const text = (match[2] || "").trim()
      return { index, text }
    }
  )

  const candidates = framesByBracket.length >= 1 ? framesByBracket : framesByNumber
  const normalized: string[] = []
  for (let i = 1; i <= 9; i += 1) {
    const found = candidates.find((frame) => frame.index === i)
    if (!found || !found.text) return []
    normalized.push(found.text)
  }

  return normalized
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
  const { feed_style_id, style_name, description, preview_prompt } = body || {}

  if (!feed_style_id || !style_name || !description) {
    return NextResponse.json(
      { error: "feed_style_id, style_name, and description are required." },
      { status: 400 },
    )
  }

  let previewPromptText = String(preview_prompt || "").trim()
  if (!previewPromptText) {
    const previewRequest = `Create a preview prompt (3x3 grid, 9 scenes) for this feed style:\n\nStyle Name: ${style_name}\n\nDescription:\n${description}\n\nGenerate a prompt that describes all 9 scenes in a 3x3 grid layout. Each scene should be distinct (different activities, poses, framings) but maintain the overall aesthetic.\n\nInclude:\n- Opening statement about the 3x3 grid\n- Description of 9 frames (label them 1-9)\n- Overall aesthetic and mood\n- Color grading instructions\n- Photography style notes\n\nTarget length: 200-250 words.`

    previewPromptText = await callMaya(previewRequest)
  }

  const frameOutlines: string[] = extractFramesFromPreview(previewPromptText)
  if (frameOutlines.length !== 9) {
    return NextResponse.json(
      {
        error: "PREVIEW_FRAMES_REQUIRED",
        details:
          "Preview prompt must include exactly 9 scene outlines labeled [1]...[9] or numbered 1-9 on separate lines.",
      },
      { status: 422 },
    )
  }

  const scene_prompts = []
  for (let position = 1; position <= 9; position += 1) {
    const guidance = POSITION_GUIDANCE[position as keyof typeof POSITION_GUIDANCE]
    const frameOutline = frameOutlines[position - 1] || ""
    const hasPersonMention = /(woman|person|model|subject)/i.test(frameOutline)
    const sceneRequest = `Create a single scene prompt for position ${position} in this feed style.\n\nStyle Name: ${style_name}\n\nDescription:\n${description}\n\nPreview prompt (single source of truth):\n${previewPromptText}\n\nFrame outline for this position (use this as the actual scene content):\n${frameOutline}\n\nPosition ${position} should be: ${guidance}\n\nRules:\n- Build the scene directly from the frame outline. Do not invent new scenes.\n- If the frame outline includes a person, keep a person. If it does not, do not add a person.\n- Keep the same aesthetic, color grade, and photography style from the preview.\n\nOutput a single scene prompt (150-200 words) that expands this frame outline without changing its subject.`

    const prompt_text = await callMaya(sceneRequest)
    scene_prompts.push({ position, prompt: prompt_text })
  }

  return NextResponse.json({
    feed_style_id,
    preview_prompt: previewPromptText,
    scene_prompts,
  })
}
