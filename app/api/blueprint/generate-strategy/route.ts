import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(req: NextRequest) {
  try {
    const { formData, topics, brandTone, feedStyle, selfieSkills } = await req.json()

    if (!formData?.business || !formData?.dreamClient) {
      return NextResponse.json({ error: "Business and dream client are required" }, { status: 400 })
    }

    const { text } = await generateText({
      model: "openai/gpt-4o",
      temperature: 0.7,
      maxTokens: 2500,
      system: `You are a strategic brand consultant specializing in personal brands for service-based entrepreneurs. 

Your role is to analyze their business, audience, and positioning to create a comprehensive brand strategy framework.

Output ONLY valid JSON matching this exact structure:
{
  "brand_identity": {
    "mission": "string - their transformational purpose in 1 sentence",
    "vision": "string - aspirational future for their clients in 1 sentence",
    "personality": "string - 3-5 brand personality traits",
    "tone": "string - how they should communicate",
    "differentiation": "string - what makes them uniquely valuable"
  },
  "audience_profile": {
    "desires": "string - what their dream clients want most",
    "fears": "string - what keeps their clients up at night",
    "buying_triggers": "string - what motivates them to invest"
  },
  "messaging_pillars": [
    {
      "pillar": "string - pillar name",
      "description": "string - what this pillar communicates",
      "example_topics": ["topic1", "topic2", "topic3"]
    }
  ],
  "authority_anchor": "string - their signature expertise positioning statement",
  "story_theme": "string - the transformation narrative they embody",
  "weekly_content_map": {
    "monday": "string - strategic content focus",
    "tuesday": "string - strategic content focus",
    "wednesday": "string - strategic content focus",
    "thursday": "string - strategic content focus",
    "friday": "string - strategic content focus",
    "saturday": "string - strategic content focus",
    "sunday": "string - strategic content focus"
  },
  "recommended_next_step": "string - specific action to implement this strategy"
}

Guidelines:
- Be specific to their business type and dream client
- Create 3-5 messaging pillars that are distinct and strategic
- Make the authority anchor memorable and ownable
- Keep tone professional, strategic, and actionable
- No emojis, no fluff, pure strategy
- Base recommendations on their actual answers`,
      prompt: `Create a comprehensive brand strategy for this entrepreneur:

BUSINESS TRANSFORMATION: ${formData.business}

DREAM CLIENT: ${formData.dreamClient}

MAIN STRUGGLE: ${formData.struggle || "Building consistent visibility"}

${topics ? `WANTS TO BE KNOWN FOR: ${topics}` : ""}

${brandTone ? `BRAND TONE: ${brandTone === "bold" ? "Bold & Confident" : brandTone === "soft" ? "Soft & Empathetic" : brandTone === "expert" ? "Expert & Direct" : brandTone === "playful" ? "Playful & Warm" : brandTone}` : ""}

FEED STYLE: ${feedStyle || "minimal"}

SELFIE SKILLS: ${JSON.stringify(selfieSkills)}

POST FREQUENCY: ${formData.postFrequency || "3-4 times per week"}

Analyze their business, audience, and positioning to create a strategic framework that will guide their content, messaging, and brand presence. Be specific and tactical.`,
    })

    const strategy = JSON.parse(text)

    return NextResponse.json({ success: true, strategy })
  } catch (error) {
    console.error("Error generating strategy:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate strategy" },
      { status: 500 },
    )
  }
}
