/**
 * SSELFIE Brand Brain v329.1.2026
 * The single source of truth for brand identity, voice, and strategy
 *
 * This file is the "truth" that all agents reference.
 * Update this when brand decisions change.
 */

import { BrandBrain } from "../types"

export const SSELFIE_BRAND_BRAIN: BrandBrain = {
  version: "329.1.2026",
  lastUpdated: new Date("2026-01-29"),

  identity: {
    mission:
      "I help women who've been through heartbreak, burnout, or identity loss become visible again, with a brand that feels like them and a system that makes showing up simple. I build both the confidence and the structure so they stop disappearing.",
    coreValues: [
      "Truth over polish",
      "Simplicity over overwhelm",
      "Consistency over intensity",
    ],
    personalityTraits: [
      "Warm + supportive",
      "Bold + straight to the point",
      "Calm confidence (premium, not chaotic)",
    ],
    brandTruths: [
      "I help women who've been through heartbreak, burnout, or identity loss become visible again.",
      "I build both the confidence and the structure so they stop disappearing.",
      "I help them create a brand that feels like them.",
    ],
    boundaries: [
      "Not 'Reinvention' (big no)",
      "Not 'hustle', 'grind', 'girlboss'",
    ],
  },

  audience: {
    demographics: {
      ageRange: "28-45 (core), with some 45-55",
      primaryGender: "Women",
      locations: ["English-speaking markets", "Nordic/European markets"],
      lifeSituation: [
        "Often moms/caretakers",
        "Rebuilding after relationship shifts",
        "Major life transitions",
      ],
    },
    psychographics: {
      currentFeelings: [
        "I feel invisible and disconnected from my old identity",
        "I'm struggling with decision fatigue and inconsistent visibility",
        "I don't trust my message yet and feel overwhelmed by AI",
      ],
      objections: [
        "I don't have time",
        "I'm not good on camera / I hate my selfies",
        "My life is messy right now",
      ],
      desiredTransformation: {
        from: "Inconsistent visibility and feeling invisible",
        to: "Feel confident showing up again — without performing",
      },
    },
    howToSpeakToThem: [
      "Address decision fatigue directly",
      "Promise clarity and consistency",
      "Acknowledge their time constraints",
    ],
  },

  offers: [
    {
      id: "brand-engine",
      name: "The SSELFIE Brand Engine",
      type: "productized_service",
      forWho: "Women who've been through heartbreak, burnout, or identity loss",
      promise:
        "A private AI brand operating system configured for ONE brand that stores the brand brain, guides decisions daily, and keeps messaging consistent.",
      price: "$5000 onetime setup then $199 per month",
      cta: "Comment 'ENGINE' (or 'DM 'ENGINE') to apply for the Brand Engine build / pilot slot",
      isActive: true,
    },
  ],

  voice: {
    toneDescription: "Warm, direct, and grounded. Best-friend energy with CEO clarity.",
    voiceRules: {
      do: [
        "Use simple, everyday language",
        "Sound warm and supportive",
        "Keep it premium and calm",
      ],
      dont: [
        "Use overly salesy or pressure-y language",
        "Sound like a corporate jargon speaker",
      ],
    },
    bannedWords: [
      "Reinvention",
      "Hustle",
      "Girlboss",
      "Overnight success",
      "Manifest instantly",
      "Corporate jargon",
      "Anything overly salesy or pressure-y",
      "Overly spiritual fluff",
    ],
    exampleLines: [
      "I used to think I needed more motivation. I didn't. I needed a system.",
      "When life gets heavy, motivation disappears… and your brand disappears with it.",
      "I'm not here to give you another template you'll forget about.",
      "I built SSELFIE because I was tired of 'being inspired' and still feeling stuck.",
      "You don't need to be perfect; you just need to show up.",
      "Let's turn your visibility into income without being salesy.",
      "You are not alone in feeling lost; I'm here to guide you.",
      "Your brand should feel like you, not a performance.",
      "We'll create a system that works even when your energy is low.",
      "It's time to trust yourself and your message again.",
    ],
  },

  rules: {
    contentConsistencyRules: [
      "Always prioritize simplicity over overwhelm",
      "Never use corporate jargon or overly salesy language",
      "Every post must resonate with the audience's pain points",
    ],
    voiceGuardrails: [
      "Tone must be: warm and supportive",
      "Banned: words like hustle, grind, and corporate jargon",
      "Required: must-use language that feels personal and relatable",
    ],
    messagingGuardrails: [
      "Lead with decision fatigue",
      "Always acknowledge the common objection of time constraints",
      "End with a clear and simple CTA",
    ],
    qualityChecklist: [
      "Uses simple, everyday language",
      "Addresses the target audience",
      "Aligns with core values",
      "Avoids banned words",
    ],
  },

  currentFocus: {
    priorityGoal:
      "Use Sandra as Client #0, run the engine weekly, publish first case study + demo walkthrough, close 1-2 pilot clients",
    weeklyPriorities: {
      "Week 1-2": "Focus on running the engine and gathering feedback",
      "Week 3-4": "Publish case studies and demos",
    },
    primaryOfferToPush: {
      offerId: "brand-engine",
      whyNow: "To help women stop disappearing and regain visibility",
    },
    timeBudget: "10-15 hours weekly focused time",
    whatToIgnore: [
      "Overbuilding features",
      "Distractions from social media trends",
      "Anything that doesn't align with the core values",
    ],
    successMetrics: [
      "1-2 pilot clients closed",
      "Positive feedback from Client #0",
    ],
  },

  contentStrategy: {
    platforms: [
      {
        platform: "instagram",
        cadence: "5 posts per week (mix of reels + carousels) + daily stories",
        contentMix: ["Reels", "Carousels", "Stories"],
      },
      {
        platform: "tiktok",
        cadence: "3-5 videos per week (repurposed + raw BTS)",
        contentMix: ["Repurposed content", "Raw BTS"],
      },
      {
        platform: "email",
        cadence: "1 email per week (simple, story + lesson + CTA)",
        contentMix: ["Story-driven emails"],
      },
    ],
    contentPillars: [
      {
        id: "identity-confidence",
        name: "Identity + Confidence",
        description: "Rebuilding self-trust and showing up when you don't feel ready",
        postAngles: [
          "I lost myself and found myself again",
          "Emotional honesty + practical steps to rebuild",
        ],
      },
      {
        id: "visibility-personal-brand",
        name: "Visibility + Personal Brand",
        description: "Guidance on what to post and message clarity",
        postAngles: [
          "What to post today?",
          "Becoming recognizable without overthinking",
        ],
      },
      {
        id: "systems-ai",
        name: "Systems + AI",
        description: "Solving decision fatigue with structure",
        postAngles: [
          "The system that keeps me showing up",
          "How AI can help without overwhelming",
        ],
      },
    ],
    ctaMapping: [
      {
        funnelStage: "top",
        cta: "Comment 'SELFIE' for FREE Selfie Brand Blueprint",
        triggerWord: "SELFIE",
      },
      {
        funnelStage: "mid",
        cta: "Comment 'STUDIO' for a link to SSELFIE STUDIO",
        triggerWord: "STUDIO",
      },
      {
        funnelStage: "bottom",
        cta: "Comment 'ENGINE' to apply for the Brand Engine build / pilot slot",
        triggerWord: "ENGINE",
      },
    ],
    contentFormula: "[Hook] + [Value/Story] + [CTA style]",
  },
}

/**
 * Helper function to get the active offer
 */
export function getActiveOffer() {
  return SSELFIE_BRAND_BRAIN.offers.find((o) => o.isActive)
}

/**
 * Helper function to get CTA by funnel stage
 */
export function getCTAByFunnelStage(stage: "top" | "mid" | "bottom") {
  return SSELFIE_BRAND_BRAIN.contentStrategy.ctaMapping.find(
    (c) => c.funnelStage === stage
  )
}

/**
 * Helper to check if a word is banned
 */
export function isBannedWord(word: string): boolean {
  return SSELFIE_BRAND_BRAIN.voice.bannedWords.some(
    (banned) => word.toLowerCase().includes(banned.toLowerCase())
  )
}

/**
 * Helper to get pillar by ID
 */
export function getPillarById(pillarId: string) {
  return SSELFIE_BRAND_BRAIN.contentStrategy.contentPillars.find(
    (p) => p.id === pillarId
  )
}
