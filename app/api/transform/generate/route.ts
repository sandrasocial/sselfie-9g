import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

import { requireAcademyUser } from "@/lib/academy-server-access"
import { deductCredits, getUserCredits } from "@/lib/credits"
import { generateWithNanoBanana } from "@/lib/nano-banana-client"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const maxDuration = 60

const sql = neon(process.env.DATABASE_URL!)
const TRANSFORM_CREDIT_COST = 3

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string") return false
  try {
    const u = new URL(value)
    return u.protocol === "https:" || u.protocol === "http:"
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { neonUser } = await requireAcademyUser()

    const body = await request.json().catch(() => null)
    const imageUrl = body?.imageUrl as unknown
    const promptText = typeof body?.promptText === "string" ? body.promptText.trim().slice(0, 1200) : ""
    const promptTitle = typeof body?.promptTitle === "string" ? body.promptTitle.trim().slice(0, 120) : ""

    if (!isValidUrl(imageUrl)) {
      return NextResponse.json({ error: "A valid image URL is required" }, { status: 400 })
    }
    if (!promptText) {
      return NextResponse.json({ error: "Prompt text is required" }, { status: 400 })
    }

    const balance = await getUserCredits(neonUser.id)
    if (balance < TRANSFORM_CREDIT_COST) {
      return NextResponse.json(
        {
          error: `You need ${TRANSFORM_CREDIT_COST} credits to transform a photo. You have ${balance}.`,
          creditsNeeded: TRANSFORM_CREDIT_COST,
          creditsAvailable: balance,
          topupUrl: "/checkout/transform?plan=topup",
        },
        { status: 402 },
      )
    }

    const result = await generateWithNanoBanana({
      prompt: promptText,
      image_input: [imageUrl],
      aspect_ratio: "1:1",
      resolution: "2K",
      output_format: "jpg",
    })

    const deduction = await deductCredits(
      neonUser.id,
      TRANSFORM_CREDIT_COST,
      "image",
      `Transform: ${promptTitle || "custom prompt"}`,
      result.predictionId,
    )

    if (!deduction.success) {
      return NextResponse.json({ error: deduction.error ?? "Credit deduction failed" }, { status: 402 })
    }

    await sql`
      INSERT INTO transform_generations
        (user_id, prediction_id, input_image_url, prompt_title, prompt_text, status, credits_used)
      VALUES
        (${neonUser.id}, ${result.predictionId}, ${imageUrl as string}, ${promptTitle}, ${promptText}, 'processing', ${TRANSFORM_CREDIT_COST})
    `

    return NextResponse.json({
      predictionId: result.predictionId,
      status: result.status,
      creditsRemaining: deduction.newBalance,
    })
  } catch (error) {
    console.error("[transform/generate] Error:", error)
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 })
  }
}
