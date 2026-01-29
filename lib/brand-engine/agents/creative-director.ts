/**
 * CREATIVE DIRECTOR AGENT
 *
 * Develops the creative vision for content:
 * - Content angles and story beats
 * - Visual concepts and shot lists
 * - Format recommendations
 * - Creative briefs
 *
 * Works with Voice/Copy Agent for execution
 */

import { SSELFIE_BRAND_BRAIN } from "../brand-brain/sselfie-brand-brain"

export const CREATIVE_DIRECTOR_SYSTEM_PROMPT = `You are the Creative Director for SSELFIE.

Your job is to develop content angles, visual concepts, and creative direction that:
1. Stops the scroll
2. Feels authentic (not performative)
3. Connects to the audience's real struggles
4. Moves them toward the transformation

BRAND ESSENCE:
${SSELFIE_BRAND_BRAIN.identity.mission}

VISUAL STYLE:
- Premium but approachable
- Calm confidence, not chaotic energy
- Real moments over staged perfection
- Warm tones, natural light aesthetic

CONTENT PILLARS TO DRAW FROM:
${SSELFIE_BRAND_BRAIN.contentStrategy.contentPillars.map((p) => `
${p.name}:
- ${p.description}
- Angles: ${p.postAngles.join(", ")}
`).join("\n")}

AUDIENCE EMOTIONAL STATE:
${SSELFIE_BRAND_BRAIN.audience.psychographics.currentFeelings.map((f) => `"${f}"`).join("\n")}

TRANSFORMATION WE'RE SELLING:
From: ${SSELFIE_BRAND_BRAIN.audience.psychographics.desiredTransformation.from}
To: ${SSELFIE_BRAND_BRAIN.audience.psychographics.desiredTransformation.to}

CREATIVE PRINCIPLES:
1. TRUTH OVER POLISH - Real moments beat perfect production
2. SIMPLICITY - One clear message per piece
3. RELATABILITY - "She gets it" > "She's so inspiring"
4. ACTIONABLE - Every piece should make them feel capable
5. CONSISTENT - Same vibe, different angles

AVOID:
- Hustle/grind aesthetics
- Over-produced "influencer" looks
- Performative vulnerability
- Generic motivational content
- Anything that feels exhausting
`

export type CreativeRequest = {
  pillar: string
  angle: string
  format: "reel" | "carousel" | "static" | "story_series" | "email"
  platform: "instagram" | "tiktok" | "email"
  goal: "awareness" | "engagement" | "conversion"
}

export type ContentAngle = {
  title: string
  hook: string
  storyBeat: string[]
  visualConcept: string
  callToFeeling: string // What emotion should they feel?
  cta: string
}

export type VisualConcept = {
  setting: string
  lighting: string
  mood: string
  wardrobe?: string
  props?: string[]
  shotList?: string[]
  textOverlays?: string[]
}

export type CreativeBrief = {
  angle: ContentAngle
  visual: VisualConcept
  format: string
  duration?: string
  executionNotes: string[]
}

/**
 * Generate content angles for a pillar
 */
export function buildAnglePrompt(pillar: string, count: number = 5): string {
  const pillarData = SSELFIE_BRAND_BRAIN.contentStrategy.contentPillars.find(
    (p) => p.id === pillar || p.name.toLowerCase().includes(pillar.toLowerCase())
  )

  return `
Generate ${count} unique content angles for the "${pillarData?.name || pillar}" pillar.

PILLAR DESCRIPTION: ${pillarData?.description || ""}
EXISTING ANGLES: ${pillarData?.postAngles.join(", ") || ""}

For each angle, provide:
1. TITLE: Short, punchy name for the angle
2. HOOK: The scroll-stopping opening line
3. STORY BEATS: 3-4 key points to cover
4. VISUAL CONCEPT: One-line description of the look/feel
5. CALL TO FEELING: What emotion should they walk away with?

CREATIVE DIRECTION:
- Make it feel like a conversation, not a lecture
- Lead with relatable struggle, bridge to capability
- Show the "after" without ignoring the "before"
- Keep it real - imperfect is perfect

TARGET FEELING: "She's talking directly to me"
`
}

/**
 * Generate visual concept for content
 */
export function buildVisualPrompt(request: CreativeRequest): string {
  return `
Create a visual concept for this content:

PILLAR: ${request.pillar}
ANGLE: ${request.angle}
FORMAT: ${request.format}
PLATFORM: ${request.platform}

Visual direction should be:
- Premium but not unapproachable
- Calm, confident energy
- Natural and authentic
- Warm color palette

Provide:
1. SETTING: Where is this filmed/shot?
2. LIGHTING: Natural light? Studio? Mood lighting?
3. MOOD: One word that captures the vibe
4. WARDROBE: What should she wear?
5. PROPS: Any items that support the story?
6. SHOT LIST: Key shots needed (if video)
7. TEXT OVERLAYS: Any on-screen text?

Remember: Truth over polish. This should look like her real life, elevated.
`
}

/**
 * Generate carousel structure
 */
export function buildCarouselPrompt(topic: string, slideCount: number = 7): string {
  return `
Create a carousel structure about: ${topic}

SLIDE COUNT: ${slideCount}

Structure:
1. COVER: Hook that stops scroll + visual intrigue
2. PROBLEM: Name the struggle they're feeling
3-${slideCount - 2}. VALUE: 3-${slideCount - 4} key points/tips/insights
${slideCount - 1}. TRANSFORMATION: Paint the "after" picture
${slideCount}. CTA: Clear next step

For each slide, provide:
- Headline (big text)
- Supporting text (smaller, optional)
- Visual direction

Voice: Warm, direct, friend-to-friend
Avoid: Lists of "tips" that feel generic
Include: Specific, relatable examples
`
}

/**
 * Generate Reel/TikTok script structure
 */
export function buildReelPrompt(hook: string, duration: "15s" | "30s" | "60s"): string {
  const beatCount = duration === "15s" ? 3 : duration === "30s" ? 5 : 7

  return `
Create a Reel/TikTok script structure.

HOOK: "${hook}"
DURATION: ${duration}
BEAT COUNT: ${beatCount}

Structure:
1. HOOK (first 3 seconds) - Stop the scroll
2-${beatCount - 1}. STORY BEATS - Build tension and value
${beatCount}. RESOLUTION + CTA

For each beat, provide:
- What to say (word-for-word)
- What to show (visual)
- Timing (seconds)

ENERGY: Calm confidence (not hype or frantic)
PACING: Conversational, like talking to a friend
B-ROLL IDEAS: Authentic daily moments

Remember:
- Hook must hit in first 1-2 seconds
- Each beat should flow naturally
- End with clear CTA but not salesy
- Could be filmed in one take if needed (simple execution)
`
}

/**
 * Content format recommendations
 */
export const FORMAT_RECOMMENDATIONS = {
  awareness: {
    instagram: ["reels", "carousels"],
    tiktok: ["short_form_video"],
    email: ["story_email"],
  },
  engagement: {
    instagram: ["carousels", "stories_with_polls"],
    tiktok: ["duets", "response_videos"],
    email: ["question_email"],
  },
  conversion: {
    instagram: ["carousels", "dm_trigger_posts"],
    tiktok: ["testimonial_style"],
    email: ["promo_with_story"],
  },
}

/**
 * Export agent configuration
 */
export const CREATIVE_DIRECTOR_CONFIG = {
  agentId: "creative_director",
  name: "Creative Director Agent",
  description: "Develops content angles, visual concepts, and creative briefs",
  systemPrompt: CREATIVE_DIRECTOR_SYSTEM_PROMPT,
  inputs: ["creative_request", "brand_brain", "performance_insights"],
  outputs: ["content_angles", "visual_concepts", "creative_briefs", "shot_lists"],
  worksWith: ["voice_copy"], // Hands off to Voice/Copy for execution
  formatRecommendations: FORMAT_RECOMMENDATIONS,
}
