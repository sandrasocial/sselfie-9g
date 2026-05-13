import { generateText } from "ai"

const MODEL = "anthropic/claude-sonnet-4-20250514"
const MAX_OUTPUT_TOKENS = 2400

export interface FreebieInput {
  name: string
  business_type: string
  target_audience: string
  transformation_story?: string
  brand_vibe: string
}

export interface BrandStrategyPack {
  positioning: string[]
  pillars: Array<{
    name: string
    description: string
    postIdeas: string[]
  }>
  voice: {
    tone: string
    do: string
    avoid: string
    phrases: string[]
  }
  captionStarters: string[]
  examplePosts: Array<{
    hook: string
    body: string
    cta: string
  }>
}

function buildFreebiePrompt(input: FreebieInput): string {
  return `You are Maya, a warm, sharp brand strategist for female entrepreneurs.

Your job: generate a **personal strategy foundation** that feels personal, confident, and actionable — not generic. Use short sentences. Be warm, honest, permission-giving. No corporate words.

**This person's brand data:**
Name: ${input.name}
Business: ${input.business_type}
Target audience: ${input.target_audience}
${input.transformation_story ? `Their story: ${input.transformation_story}` : ""}
Brand vibe: ${input.brand_vibe}

**2026 Instagram context to weave in:**
- Short-form video (Reels 7-30s) dominates reach in 2026
- "Save-worthy" carousels (educational, relatable) drive follower growth
- Authenticity > polish — raw, real content outperforms edited
- Niche consistency beats posting variety — one clear topic wins
- Strong visual identity matters more than frequency
- Personal stories and behind-the-scenes build the deepest loyalty
- Posting 3-4x per week is the sweet spot for algorithm reach

**Return ONLY valid JSON** in this exact shape:
{
  "positioning": ["...", "..."],
  "pillars": [
    {"name":"...","description":"...","postIdeas":["...","...","..."]}
  ],
  "voice": {"tone":"...","do":"...","avoid":"...","phrases":["...","...","..."]},
  "captionStarters": ["..."x10],
  "examplePosts": [
    {"hook":"...","body":"...","cta":"..."}
  ]
}

Rules:
- Positioning: 1-2 options, 1-2 sentences each. Reference their actual story and audience.
- Pillars: 3-5 content pillars that make sense for their business.
- Caption starters: 10, all starting with "I" or "You" or a hook word — warm, real.
- Example posts: 3 short punchy Reels/carousel captions with a hook, 2-3 sentence body, CTA.
- Weave in their actual story. Make it feel like it was written for them specifically.
- Voice do/avoid must be specific to their vibe (${input.brand_vibe}), not generic.
`
}

function parseStrategyJson(text: string): BrandStrategyPack {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("No JSON found in response")

  return JSON.parse(jsonMatch[0]) as BrandStrategyPack
}

export async function generateFreebieStrategy(input: FreebieInput): Promise<BrandStrategyPack> {
  const prompt = buildFreebiePrompt(input)
  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  })

  try {
    return parseStrategyJson(text)
  } catch {
    const retryPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown. No commentary.`
    const retry = await generateText({
      model: MODEL,
      prompt: retryPrompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    })

    return parseStrategyJson(retry.text)
  }
}
