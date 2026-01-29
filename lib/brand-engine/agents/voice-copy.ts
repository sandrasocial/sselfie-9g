/**
 * VOICE + COPY AGENT
 *
 * Writes content in the brand's authentic voice:
 * - Captions
 * - Hooks
 * - Scripts
 * - Email copy
 *
 * Rules-based to maintain consistency
 */

import { SSELFIE_BRAND_BRAIN, isBannedWord } from "../brand-brain/sselfie-brand-brain"

export const VOICE_COPY_SYSTEM_PROMPT = `You are the Voice & Copy Agent for SSELFIE.

Your job is to write content that sounds authentically like Sandra - warm, direct, and grounded.

VOICE PROFILE:
Tone: ${SSELFIE_BRAND_BRAIN.voice.toneDescription}

DO:
${SSELFIE_BRAND_BRAIN.voice.voiceRules.do.map((r) => `- ${r}`).join("\n")}

DON'T:
${SSELFIE_BRAND_BRAIN.voice.voiceRules.dont.map((r) => `- ${r}`).join("\n")}

BANNED WORDS (NEVER USE):
${SSELFIE_BRAND_BRAIN.voice.bannedWords.join(", ")}

EXAMPLE LINES IN HER VOICE:
${SSELFIE_BRAND_BRAIN.voice.exampleLines.map((l) => `"${l}"`).join("\n")}

CONTENT FORMULA:
${SSELFIE_BRAND_BRAIN.contentStrategy.contentFormula}

MESSAGING RULES:
${SSELFIE_BRAND_BRAIN.rules.messagingGuardrails.map((r) => `- ${r}`).join("\n")}

AUDIENCE PAIN POINTS (address these):
${SSELFIE_BRAND_BRAIN.audience.psychographics.currentFeelings.map((f) => `"${f}"`).join("\n")}

AUDIENCE OBJECTIONS (acknowledge these):
${SSELFIE_BRAND_BRAIN.audience.psychographics.objections.map((o) => `"${o}"`).join("\n")}

CTAs TO USE:
- Top of funnel: "${SSELFIE_BRAND_BRAIN.contentStrategy.ctaMapping.find((c) => c.funnelStage === "top")?.cta}"
- Mid funnel: "${SSELFIE_BRAND_BRAIN.contentStrategy.ctaMapping.find((c) => c.funnelStage === "mid")?.cta}"
- Bottom funnel: "${SSELFIE_BRAND_BRAIN.contentStrategy.ctaMapping.find((c) => c.funnelStage === "bottom")?.cta}"

WRITING STYLE:
- Short sentences
- Simple words (5th grade reading level)
- Personal and relatable
- Conversational, not corporate
- Occasionally use "..." for emphasis
- Embrace imperfection
`

export type CopyRequest = {
  type: "caption" | "hook" | "script" | "email" | "story_text"
  platform: "instagram" | "tiktok" | "email"
  pillar: string
  angle: string
  funnelStage: "top" | "mid" | "bottom"
  context?: string
  lengthGuidance?: "short" | "medium" | "long"
}

export type CopyOutput = {
  content: string
  hook: string
  cta: string
  hashtags?: string[]
  voiceCheckPassed: boolean
  voiceWarnings: string[]
}

/**
 * Generate caption based on request
 */
export function buildCaptionPrompt(request: CopyRequest): string {
  const pillar = SSELFIE_BRAND_BRAIN.contentStrategy.contentPillars.find(
    (p) => p.id === request.pillar || p.name.toLowerCase().includes(request.pillar.toLowerCase())
  )

  const cta = SSELFIE_BRAND_BRAIN.contentStrategy.ctaMapping.find(
    (c) => c.funnelStage === request.funnelStage
  )

  return `
Write an Instagram caption for SSELFIE.

PILLAR: ${pillar?.name || request.pillar}
ANGLE: ${request.angle}
CTA: ${cta?.cta}
LENGTH: ${request.lengthGuidance || "medium"} (${
    request.lengthGuidance === "short" ? "2-3 sentences" :
    request.lengthGuidance === "long" ? "5-7 sentences" :
    "3-5 sentences"
  })

${request.context ? `CONTEXT: ${request.context}` : ""}

Structure:
1. HOOK (first line that stops the scroll)
2. VALUE/STORY (the meat - relatable + useful)
3. CTA (clear next step)

Remember:
- Sound like a warm friend, not a marketer
- Address decision fatigue
- Keep it simple
- No banned words
`
}

/**
 * Generate hook variations
 */
export function buildHookPrompt(topic: string, count: number = 5): string {
  return `
Generate ${count} scroll-stopping hooks about: ${topic}

Target audience feels: ${SSELFIE_BRAND_BRAIN.audience.psychographics.currentFeelings[0]}

Hook types to include:
1. Question hook (invites response)
2. Contrarian hook (challenges common belief)
3. Story hook (starts with "I...")
4. Pain point hook (names the struggle)
5. Promise hook (hints at transformation)

Each hook should be:
- Under 10 words
- Specific, not generic
- In Sandra's voice (warm, direct, grounded)
- Addressing decision fatigue or visibility struggles

NO: Corporate speak, hustle language, hyperbole
YES: Simple words, relatable moments, calm confidence
`
}

/**
 * Generate email copy
 */
export function buildEmailPrompt(
  subject: string,
  purpose: "nurture" | "story" | "promo" | "announcement"
): string {
  return `
Write a simple email for SSELFIE.

SUBJECT LINE: ${subject}
PURPOSE: ${purpose}
FORMAT: Story + Lesson + CTA

Structure:
1. OPENING (personal, conversational - 1-2 sentences)
2. STORY (relatable moment or insight - 2-3 short paragraphs)
3. LESSON (one clear takeaway)
4. CTA (simple ask)

Voice:
- Like texting a friend who gets it
- Short paragraphs (1-3 sentences max)
- No fluff, no filler
- Warm but direct

CTA for this email: ${SSELFIE_BRAND_BRAIN.contentStrategy.ctaMapping.find((c) => c.funnelStage === purpose === "promo" ? "bottom" : "mid")?.cta}

Length: 150-250 words max
`
}

/**
 * Check copy against voice rules
 */
export function voiceCheck(copy: string): { passed: boolean; warnings: string[] } {
  const warnings: string[] = []

  // Check for banned words
  const words = copy.toLowerCase().split(/\s+/)
  SSELFIE_BRAND_BRAIN.voice.bannedWords.forEach((banned) => {
    if (copy.toLowerCase().includes(banned.toLowerCase())) {
      warnings.push(`Contains banned word: "${banned}"`)
    }
  })

  // Check for corporate jargon patterns
  const corporatePatterns = [
    /leverage/i,
    /synergy/i,
    /optimize/i,
    /maximize/i,
    /utilize/i,
    /robust/i,
    /streamline/i,
  ]
  corporatePatterns.forEach((pattern) => {
    if (pattern.test(copy)) {
      warnings.push(`Contains corporate jargon: "${copy.match(pattern)?.[0]}"`)
    }
  })

  // Check for pressure language
  const pressurePatterns = [
    /limited time/i,
    /act now/i,
    /don't miss out/i,
    /last chance/i,
    /urgently/i,
  ]
  pressurePatterns.forEach((pattern) => {
    if (pattern.test(copy)) {
      warnings.push(`Contains pressure language: "${copy.match(pattern)?.[0]}"`)
    }
  })

  // Check sentence length (prefer short)
  const sentences = copy.split(/[.!?]+/).filter((s) => s.trim())
  const longSentences = sentences.filter((s) => s.split(/\s+/).length > 25)
  if (longSentences.length > 0) {
    warnings.push(`${longSentences.length} sentence(s) are too long (25+ words)`)
  }

  return {
    passed: warnings.length === 0,
    warnings,
  }
}

/**
 * Export agent configuration
 */
export const VOICE_COPY_CONFIG = {
  agentId: "voice_copy",
  name: "Voice & Copy Agent",
  description: "Writes captions, hooks, scripts, emails in brand voice",
  systemPrompt: VOICE_COPY_SYSTEM_PROMPT,
  inputs: ["copy_request", "brand_brain"],
  outputs: ["caption", "hook_variations", "email_copy", "script"],
  voiceRules: SSELFIE_BRAND_BRAIN.voice,
  contentPillars: SSELFIE_BRAND_BRAIN.contentStrategy.contentPillars,
  qualityChecks: ["voice_check", "banned_word_scan", "readability_score"],
}
