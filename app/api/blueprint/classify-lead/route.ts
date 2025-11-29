import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateText } from "ai"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriberId } = body

    if (!subscriberId) {
      return NextResponse.json({ error: "subscriberId is required" }, { status: 400 })
    }

    // Fetch the subscriber data
    const subscriberResult = await sql`
      SELECT 
        id, email, name, business, dream_client, struggle, 
        selfie_skill_level, feed_style, post_frequency, form_data,
        blueprint_completed, blueprint_score, pdf_downloaded, 
        cta_clicked, converted_to_user, created_at,
        utm_source, utm_medium, utm_campaign, referrer
      FROM blueprint_subscribers
      WHERE id = ${subscriberId}
      LIMIT 1
    `

    if (subscriberResult.length === 0) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 })
    }

    const subscriber = subscriberResult[0]

    // Calculate engagement signals
    const engagementScore =
      (subscriber.blueprint_completed ? 40 : 0) +
      (subscriber.pdf_downloaded ? 20 : 0) +
      (subscriber.cta_clicked ? 30 : 0) +
      (subscriber.converted_to_user ? 10 : 0)

    const daysSinceSignup = Math.floor((Date.now() - new Date(subscriber.created_at).getTime()) / (1000 * 60 * 60 * 24))

    // Prepare context for AI classification
    const classificationContext = `
Analyze this Brand Blueprint subscriber and classify their lead stage, persona, and readiness to purchase.

SUBSCRIBER DATA:
- Name: ${subscriber.name}
- Business: ${subscriber.business || "Not specified"}
- Dream Client: ${subscriber.dream_client || "Not specified"}
- Main Struggle: ${subscriber.struggle || "Not specified"}
- Selfie Skill: ${subscriber.selfie_skill_level || "Not specified"}
- Feed Style Preference: ${subscriber.feed_style || "Not specified"}
- Post Frequency: ${subscriber.post_frequency || "Not specified"}
- Blueprint Score: ${subscriber.blueprint_score || "Not scored"}
- Form Data: ${JSON.stringify(subscriber.form_data || {})}

ENGAGEMENT SIGNALS:
- Blueprint Completed: ${subscriber.blueprint_completed ? "Yes" : "No"}
- PDF Downloaded: ${subscriber.pdf_downloaded ? "Yes" : "No"}
- CTA Clicked: ${subscriber.cta_clicked ? "Yes" : "No"}
- Converted to User: ${subscriber.converted_to_user ? "Yes" : "No"}
- Days Since Signup: ${daysSinceSignup}
- Engagement Score: ${engagementScore}/100

ACQUISITION CONTEXT:
- Source: ${subscriber.utm_source || "Direct"}
- Medium: ${subscriber.utm_medium || "None"}
- Campaign: ${subscriber.utm_campaign || "None"}
- Referrer: ${subscriber.referrer || "None"}

Provide a strategic intelligence assessment with:
1. Lead stage: "cold" (low engagement, browsing), "warm" (engaged, evaluating), or "hot" (high intent, ready to buy)
2. Persona type: Short descriptive label (e.g., "Struggling Beginner", "Ready Entrepreneur", "Content Creator")
3. Primary motivation: What drives them (in 1 sentence)
4. Top objections: Array of 2-3 likely purchase barriers
5. Buying likelihood: Number 0-100
6. Recommended workflow: Which nurture sequence to use ("welcome", "nurture", "upsell")

Respond ONLY with valid JSON in this exact format:
{
  "stage": "cold" | "warm" | "hot",
  "personaType": "string",
  "motivation": "string",
  "objections": ["string", "string"],
  "buyingLikelihood": number,
  "recommendedWorkflow": "welcome" | "nurture" | "upsell"
}
`

    // Generate AI classification
    const { text } = await generateText({
      model: "openai/gpt-4o",
      prompt: classificationContext,
    })

    // Parse AI response
    let intelligence
    try {
      intelligence = JSON.parse(text)
    } catch (parseError) {
      console.error("[classify-lead] Failed to parse AI response:", text)
      return NextResponse.json({ error: "Failed to parse AI classification response" }, { status: 500 })
    }

    // Add metadata
    intelligence.classifiedAt = new Date().toISOString()
    intelligence.engagementScore = engagementScore
    intelligence.daysSinceSignup = daysSinceSignup

    // Save intelligence to database
    await sql`
      UPDATE blueprint_subscribers
      SET lead_intelligence = ${JSON.stringify(intelligence)},
          updated_at = NOW()
      WHERE id = ${subscriberId}
    `

    return NextResponse.json({
      success: true,
      subscriberId,
      intelligence,
    })
  } catch (error) {
    console.error("[classify-lead] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to classify lead",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
