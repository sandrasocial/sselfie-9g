import { generateText } from "ai"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { userAnswers } = await req.json()

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return new Response("Unauthorized", { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    console.log("[v0] Generating content pillars for user:", user.email)

    const prompt = `You are Maya, a warm and friendly brand strategist. Based on the user's answers, help them discover their unique content pillars.

**User's Brand Information:**
${Object.entries(userAnswers)
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}

**Your Task:**
Analyze their brand, expertise, and audience to suggest 3-5 content pillars that will:
1. Showcase their expertise and unique value
2. Resonate with their target audience
3. Support their business goals
4. Feel authentic to who they are

**Content Pillar Guidelines:**
- Each pillar should be a broad theme they can create endless content around
- Mix educational, inspirational, and personal content types
- Ensure variety to keep their feed interesting
- Use simple, clear language (no jargon)

**Examples of Good Content Pillars:**
- Life Coach: "Mindset Tips", "Daily Motivation", "Behind the Scenes", "Client Wins", "Self-Care Practices"
- Fashion Designer: "Style Tips", "Design Process", "Outfit Ideas", "Sustainable Fashion", "My Story"
- Fitness Coach: "Workout Routines", "Nutrition Tips", "Transformation Stories", "Mindset", "Day in My Life"

Return ONLY a valid JSON object with this structure:
{
  "pillars": [
    {
      "name": "string - Short, catchy pillar name",
      "description": "string - What this pillar is about in simple language",
      "contentIdeas": ["string", "string", "string"] - 3 specific post ideas for this pillar
    }
  ],
  "explanation": "string - A warm, friendly explanation of why these pillars work for their brand (2-3 sentences in simple language)"
}`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4.5",
      apiKey: process.env.AI_GATEWAY_API_KEY,
      prompt,
      maxTokens: 2000,
    })

    console.log("[v0] Generated content pillars response")

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in response")
    }

    const result = JSON.parse(jsonMatch[0])

    return Response.json(result)
  } catch (error) {
    console.error("[v0] Error generating content pillars:", error)
    return Response.json({ error: "Failed to generate content pillars" }, { status: 500 })
  }
}
