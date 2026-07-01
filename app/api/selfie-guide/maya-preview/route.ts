import { NextResponse } from "next/server"
import { createAnthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"
import { sql } from "@/lib/db/client"

const MODEL_ID = "claude-haiku-4-5-20251001"
const MAX_TOKENS = 300
const MAX_SCENE_LENGTH = 200

interface MayaConcept {
  scene: string
  lighting: string
  aesthetic: string
  caption: string
}

const FALLBACK: MayaConcept = {
  scene: "A soft portrait in warm natural window light, minimal background, clean and editorial.",
  lighting: "Indirect daylight from a north-facing window, positioned 1 meter to the left of your face.",
  aesthetic: "Quiet luxury, approachable warmth",
  caption: "This is what showing up with intention looks like.",
}

// Simple in-memory rate limiter - max 3 requests per token per hour
interface RateLimitEntry {
  count: number
  resetAt: number
}
const rateLimitMap = new Map<string, RateLimitEntry>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return false
  }

  if (entry.count >= 3) {
    return true
  }

  entry.count += 1
  return false
}

async function validateToken(token: string): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT 1
      FROM freebie_subscribers
      WHERE access_token = ${token}
      LIMIT 1
    `
    return rows.length > 0
  } catch {
    return false
  }
}

function parseConcept(raw: string): MayaConcept | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    if (
      typeof parsed.scene === "string" &&
      typeof parsed.lighting === "string" &&
      typeof parsed.aesthetic === "string" &&
      typeof parsed.caption === "string"
    ) {
      return parsed as MayaConcept
    }
    return null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate scene
    const rawScene = typeof body.scene === "string" ? body.scene.trim() : ""
    if (!rawScene) {
      return NextResponse.json({ concept: FALLBACK })
    }
    const scene = rawScene.slice(0, MAX_SCENE_LENGTH)

    // Validate and rate-limit by token
    const token = typeof body.token === "string" ? body.token.trim() : ""

    if (token) {
      // Validate token if provided (non-blocking - still serve on invalid)
      await validateToken(token)

      if (isRateLimited(token)) {
        return NextResponse.json({ concept: FALLBACK })
      }
    }

    // Call Anthropic
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const { text } = await generateText({
      model: anthropic(MODEL_ID),
      maxOutputTokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: `Generate a selfie brand photo concept for this scene: "${scene}"\n\nRespond with ONLY valid JSON in this format:\n{"scene": "2-sentence scene description", "lighting": "one sentence lighting setup", "aesthetic": "3-5 word brand aesthetic", "caption": "one-line caption direction"}`,
        },
      ],
      system:
        "You are Maya, a visual brand strategist for SSELFIE Studio. You help women create professional selfie-based brand photography. Given a scene description, return a structured photography concept as valid JSON only - no other text.",
    })

    const concept = parseConcept(text) ?? FALLBACK
    return NextResponse.json({ concept })
  } catch (error) {
    console.error("[selfie-guide/maya-preview] error:", error)
    // Always return a concept - never a 500 to the client
    return NextResponse.json({ concept: FALLBACK })
  }
}
