import { streamText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyProductAccess } from "@/lib/academy-server-access"
import { getUserPersonalBrand } from "@/lib/data/maya"
import { getProductGenerationPrompt, type UserContext } from "@/lib/products-system-prompt"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { createMayaOpenRouterModel, getMayaMaxTokensForTask } from "@/lib/maya/openrouter"
import { VISIBILITY_MINI_PRODUCT_BY_ID, VISIBILITY_MINI_PRODUCT_IDS } from "@/lib/visibility-products"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_INPUT_LENGTH = 800

function normalise(value: unknown, max = MAX_INPUT_LENGTH): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, max)
}

function isValidProductId(value: unknown): value is (typeof VISIBILITY_MINI_PRODUCT_IDS)[number] {
  return typeof value === "string" && (VISIBILITY_MINI_PRODUCT_IDS as readonly string[]).includes(value)
}

const BASE_SYSTEM = `You are Maya, SSELFIE's AI creative director.
You are inside a focused mini-product workspace. Your only job right now is the deliverable described below.
Voice: warm, direct, practical. Short paragraphs. No hype. No filler.
Do not mention you are an AI. Do not add meta-commentary. Start the deliverable immediately.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const productId = normalise(body?.productId)

    if (!isValidProductId(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const { neonUser } = await requireAcademyProductAccess(productId)

    const topic = normalise(body?.topic)
    const context = normalise(body?.context)

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 })
    }

    const personalBrand = await getUserPersonalBrand(neonUser.id).catch(() => null)

    const userContext: UserContext = {
      brand_profile: {
        industry: normalise(personalBrand?.business_type ?? topic, 200),
        audience: normalise(personalBrand?.target_audience ?? context, 200),
        style: normalise(personalBrand?.style_preferences ?? "", 200),
        story: normalise(personalBrand?.transformation_story ?? "", 200),
        message: normalise(personalBrand?.positioning_statement ?? "", 200),
        business_model: normalise(personalBrand?.business_type ?? "", 200),
        goals: normalise(personalBrand?.business_goals ?? context, 200),
        business_type: normalise(personalBrand?.business_type ?? topic, 200),
        current_revenue: "",
        income_goals: normalise(personalBrand?.business_goals ?? context, 200),
        aesthetic: normalise(personalBrand?.brand_vibe ?? personalBrand?.style_preferences ?? "", 200),
      },
    }

    const productPrompt = getProductGenerationPrompt(productId, userContext)
    const productSlug = VISIBILITY_MINI_PRODUCT_BY_ID[productId]?.slug ?? productId.replace(/_/g, "-")

    const userMessage = [
      `Topic / offer: ${topic}`,
      context ? `Additional context: ${context}` : "",
    ]
      .filter(Boolean)
      .join("\n")

    const result = streamText({
      model: createMayaOpenRouterModel("chat_pro"),
      temperature: 0.45,
      maxTokens: Math.min(getMayaMaxTokensForTask("chat_pro"), 3000),
      system: `${BASE_SYSTEM}\n\n${productPrompt}`,
      prompt: userMessage,
    })

    void logAnalyticsEvent({
      eventName: "mini_product_generated",
      userId: neonUser.id,
      path: `/academy/access/${productSlug}`,
      properties: { product_id: productId, topic_length: topic.length },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    const routeError = academyRouteErrorToResponse(error)
    if (routeError) return routeError

    console.error("[mini-product/generate] Error:", error)
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 })
  }
}
