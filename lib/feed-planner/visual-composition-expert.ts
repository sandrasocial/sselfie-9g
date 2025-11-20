import { generateText } from "ai"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getMayaPersonality } from "@/lib/maya/personality-enhanced"

interface VisualDirectionParams {
  postPosition: number
  shotType: string
  purpose: string
  visualDirection: string
  brandVibe: string
  authUserId: string // Added to get full user context
  triggerWord?: string
}

export interface VisualComposition {
  shotSetup: {
    type: string
    angle: string
    distance: string
    framing: string
  }
  subjectDirection: {
    pose: string
    hands: string
    face: string
    movement: string
  }
  settingMood: {
    location: string
    lighting: string
    props: string[]
    colors: string[]
  }
  styling: {
    outfit: string
    hair: string
    accessories: string[]
    aesthetic: string
  }
  emotionalTone: string
  fluxPrompt: string
}

export async function generateVisualComposition(params: VisualDirectionParams): Promise<VisualComposition> {
  const { postPosition, shotType, purpose, visualDirection, brandVibe, authUserId, triggerWord } = params

  console.log(`[v0] Maya: Creating Flux prompt for post ${postPosition} (${shotType})`)

  const userContext = await getUserContextForMaya(authUserId)
  const mayaPersonality = getMayaPersonality()

  const systemPrompt = `${mayaPersonality}

${userContext}

=== FEED PLANNER MODE ===

You're creating Flux prompts for a 9-post Instagram feed. This requires visual COHESION across all images.

Key differences from concept cards:
- Concept cards = maximize diversity (different outfits, locations, vibes)
- Feed posts = visual harmony (cohesive colors, consistent lighting, unified aesthetic)

Your prompts should create images that look like they belong in the same professional photoshoot or brand campaign.

COHESION REQUIREMENTS:
1. Use the user's brand colors consistently across all 9 posts (from their brand profile above)
2. Maintain similar lighting style (if post 1 is golden hour, others should be too)
3. Keep aesthetic mood unified (same level of sophistication, similar color grading)
4. Create complementary visuals that enhance each other

${triggerWord ? `⚠️ CRITICAL: Always start Flux prompts with "${triggerWord}"` : ""}`

  const prompt = `Maya, create a detailed visual composition for Instagram post #${postPosition}.

**Layout Strategist's Decision:**
Shot Type: ${shotType}
Purpose: ${purpose}
Visual Direction: ${visualDirection}
Brand Vibe: ${brandVibe}

${triggerWord ? `Trigger Word: ${triggerWord} (must be first word in fluxPrompt)` : ""}

**Your Task:**
Create a Flux prompt for this ${shotType} shot that achieves: ${purpose}

Remember:
- Use YOUR fashion expertise and brand knowledge (from user context above)
- Apply user's brand colors naturally (you already know them from their profile)
- Create visual harmony with the other 8 posts in the feed
- Keep prompts 25-35 words for best face fidelity
- Make it feel authentic and Instagram-worthy

Return JSON with this structure:
{
  "shotSetup": { "type": "", "angle": "", "distance": "", "framing": "" },
  "subjectDirection": { "pose": "", "hands": "", "face": "", "movement": "" },
  "settingMood": { "location": "", "lighting": "", "props": [], "colors": [] },
  "styling": { "outfit": "", "hair": "", "accessories": [], "aesthetic": "" },
  "emotionalTone": "",
  "fluxPrompt": "25-35 word Flux prompt starting with trigger word"
}

Return ONLY valid JSON. No markdown.`

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    system: systemPrompt,
    prompt,
    temperature: 0.8, // Back to 0.8 for Maya's creative diversity
  })

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in Maya's response")
    }

    const composition = JSON.parse(jsonMatch[0]) as VisualComposition

    if (triggerWord && !composition.fluxPrompt.toLowerCase().startsWith(triggerWord.toLowerCase())) {
      composition.fluxPrompt = `${triggerWord} ${composition.fluxPrompt}`
    }

    console.log(`[v0] Maya: Prompt for ${shotType} - ${composition.fluxPrompt.substring(0, 60)}...`)

    return composition
  } catch (error) {
    console.error("[v0] Maya: Failed to parse visual composition:", error)
    return createFallbackComposition(shotType, purpose, triggerWord)
  }
}

function createFallbackComposition(shotType: string, purpose: string, triggerWord?: string): VisualComposition {
  const basePrompt = `natural ${shotType}, authentic moment, professional aesthetic, ${purpose}`

  return {
    shotSetup: {
      type: shotType,
      angle: "eye-level, natural perspective",
      distance: "medium shot, perfectly framed",
      framing: "rule of thirds, balanced composition",
    },
    subjectDirection: {
      pose: "natural, relaxed, confident",
      hands: "naturally positioned",
      face: "authentic expression, engaging",
      movement: "slight natural energy",
    },
    settingMood: {
      location: "naturally lit environment",
      lighting: "natural light, authentic atmosphere",
      props: ["minimal, authentic styling"],
      colors: ["brand-appropriate tones"],
    },
    styling: {
      outfit: "effortlessly chic, brand-aligned",
      hair: "natural, polished",
      accessories: ["minimal, elegant"],
      aesthetic: "authentic influencer aesthetic",
    },
    emotionalTone: "confident, approachable, aspirational",
    fluxPrompt: triggerWord ? `${triggerWord} ${basePrompt}` : basePrompt,
  }
}
