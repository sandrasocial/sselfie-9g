export const AI_PHOTOSHOOT_AUDIENCE = {
  name: "AI Photoshoot Audience",
  resendSegmentEnvKey: "RESEND_SEGMENT_AI_PHOTOSHOOT_AUDIENCE",
  canonicalTag: "ai-photoshoot-audience",
  source: "ai-photoshoot",
  segment: "ai-photoshoot-audience",
  product: "ai-photoshoot-prompts",
} as const

export const AI_PHOTOSHOOT_INTENT_TAGS = {
  curious: "ai-photoshoot-curious",
  activated: "ai-photoshoot-activated",
  buyer: "ai-photoshoot-buyer",
  powerUser: "ai-photoshoot-power-user",
  abandoned: "ai-photoshoot-abandoned",
} as const

export type AiPhotoshootIntent = keyof typeof AI_PHOTOSHOOT_INTENT_TAGS

export function buildAiPhotoshootEmailTags(
  existingTags: string[] | null | undefined,
  intents: AiPhotoshootIntent[] = ["curious"],
): string[] {
  const tags = new Set<string>((existingTags || []).filter(Boolean))

  tags.add(AI_PHOTOSHOOT_AUDIENCE.canonicalTag)
  for (const intent of intents) {
    tags.add(AI_PHOTOSHOOT_INTENT_TAGS[intent])
  }

  return Array.from(tags)
}

export function buildAiPhotoshootResendTags(intent: AiPhotoshootIntent) {
  return {
    audience: AI_PHOTOSHOOT_AUDIENCE.source,
    segment: AI_PHOTOSHOOT_AUDIENCE.segment,
    product: AI_PHOTOSHOOT_AUDIENCE.product,
    ai_photoshoot_audience: "true",
    ai_photoshoot_intent: intent,
  } as const
}

export function isAiPhotoshootAudienceTag(tag: string): boolean {
  return (
    tag === AI_PHOTOSHOOT_AUDIENCE.canonicalTag ||
    Object.values(AI_PHOTOSHOOT_INTENT_TAGS).includes(tag as (typeof AI_PHOTOSHOOT_INTENT_TAGS)[AiPhotoshootIntent])
  )
}
