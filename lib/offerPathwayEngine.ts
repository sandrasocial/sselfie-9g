/**
 * Offer Pathway Engine
 * Pure deterministic logic for computing offer recommendations
 * NO database calls - all data passed in as parameters
 */

export interface OfferInputData {
  intentScore: number // 0-100
  signals: Array<{ type: string; value: number }>
  emailOpens: number
  apaHistory: Array<{ offer: string; sent_at: Date }>
  journeyPosition: string // "lead" | "nurture" | "warm" | "hot" | "customer"
  blueprintScore?: number
  behaviorScore?: number
  daysSinceSignup?: number
  cta_clicked?: boolean
}

export interface OfferRecommendation {
  recommendation: "membership" | "credits" | "studio" | "trial" | null
  confidence: number // 0-1
  rationale: string
  nextSequence: string[]
}

/**
 * Compute offer recommendation based on subscriber data
 */
export function computeOfferRecommendation(input: OfferInputData): OfferRecommendation {
  const {
    intentScore,
    signals,
    emailOpens,
    apaHistory,
    journeyPosition,
    behaviorScore = 0,
    blueprintScore = 0,
    daysSinceSignup,
  } = input

  // RULE 1: Already a buyer → studio recommendation
  if (journeyPosition === "customer") {
    return {
      recommendation: "studio",
      confidence: 0.9,
      rationale: "Already a customer - recommend studio upgrade path",
      nextSequence: ["studio", "credits"],
    }
  }

  // RULE 2: High-intent (70+) → membership recommended
  if (intentScore >= 70) {
    return {
      recommendation: "membership",
      confidence: 0.85,
      rationale: `High intent score (${intentScore}) indicates strong buying signal - recommend full membership`,
      nextSequence: ["membership", "credits", "trial"],
    }
  }

  // RULE 3: Moderate intent (40–70) → credits recommended
  if (intentScore >= 40 && intentScore < 70) {
    return {
      recommendation: "credits",
      confidence: 0.75,
      rationale: `Moderate intent score (${intentScore}) suggests interest but not ready for full commitment - recommend credits`,
      nextSequence: ["credits", "trial", "membership"],
    }
  }

  // RULE 4: Low intent (<40) but high engagement → trial recommended
  if (intentScore < 40 && (emailOpens >= 3 || behaviorScore >= 30)) {
    return {
      recommendation: "trial",
      confidence: 0.6,
      rationale: `Low intent (${intentScore}) but high engagement (${emailOpens} opens, ${behaviorScore} behavior score) - recommend trial`,
      nextSequence: ["trial", "credits", "membership"],
    }
  }

  // RULE 5: Very low intent → no recommendation yet
  if (intentScore < 40 && emailOpens < 3 && behaviorScore < 30) {
    return {
      recommendation: null,
      confidence: 0.4,
      rationale: `Very low intent (${intentScore}) and engagement - continue nurture before offering`,
      nextSequence: ["trial"],
    }
  }

  // Fallback: trial as safe default
  return {
    recommendation: "trial",
    confidence: 0.5,
    rationale: "Default recommendation based on current data",
    nextSequence: ["trial", "credits", "membership"],
  }
}
