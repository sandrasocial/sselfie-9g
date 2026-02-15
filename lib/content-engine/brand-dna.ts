export interface BrandDna {
  voice: {
    traits: string[]
    sentenceStyle: string
    preferredPhrases: string[]
    bannedWords: string[]
  }
  originStoryBeats: string[]
  audience: {
    primary: string
    pains: string[]
    desires: string[]
  }
  offerContext: {
    coreOffer: string
    ctaStyle: string
  }
  storytellingFramework: {
    sequence: string[]
    requiredElements: string[]
  }
}

export const SANDRA_BRAND_DNA: BrandDna = {
  voice: {
    traits: ["warm", "real", "clear", "encouraging", "actionable"],
    sentenceStyle: "Short sentences. Direct language. One clear next step.",
    preferredPhrases: ["you've got this", "let's make this easy", "quick win", "here's what I'd do next"],
    bannedWords: ["unlock", "game-changer", "level up", "transform", "elevate", "synergy"],
  },
  originStoryBeats: [
    "Built SSELFIE while under financial pressure as a single mom",
    "Started from visibility pain and turned selfies into business assets",
    "Mission is women-first freedom through simple systems",
  ],
  audience: {
    primary: "Women entrepreneurs and creators rebuilding identity and income",
    pains: [
      "I don't know what to post",
      "I can't stay consistent",
      "I am overwhelmed by too many tools",
      "I feel invisible and disconnected from sales",
    ],
    desires: [
      "A clear next step",
      "Consistent content that sounds like me",
      "More qualified leads and sales",
      "Time freedom with less chaos",
    ],
  },
  offerContext: {
    coreOffer: "Brand Engine and SSELFIE systems",
    ctaStyle: "Low-pressure, specific, practical",
  },
  storytellingFramework: {
    sequence: ["pain", "truth", "turn", "practical step", "invitation"],
    requiredElements: [
      "Name one audience pain explicitly",
      "Show one emotional truth from lived experience",
      "Include one specific actionable step",
      "End with one clear CTA",
    ],
  },
}

export function compactJournalContext(input: {
  featuresBuilt?: string | null
  personalStory?: string | null
  struggles?: string | null
  wins?: string | null
  weeklyGoals?: string | null
  futureVision?: string | null
}) {
  const trim = (value?: string | null) => (value || "").replace(/\s+/g, " ").trim().slice(0, 220)

  return {
    featuresBuilt: trim(input.featuresBuilt),
    personalStory: trim(input.personalStory),
    struggles: trim(input.struggles),
    wins: trim(input.wins),
    weeklyGoals: trim(input.weeklyGoals),
    futureVision: trim(input.futureVision),
  }
}

export function hasPainAndDesireSignals(text: string, dna: BrandDna) {
  const content = text.toLowerCase()
  const painHit = dna.audience.pains.some((item) => {
    const parts = item.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3)
    return parts.some((token) => content.includes(token))
  })
  const desireHit = dna.audience.desires.some((item) => {
    const parts = item.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3)
    return parts.some((token) => content.includes(token))
  })

  return painHit && desireHit
}
