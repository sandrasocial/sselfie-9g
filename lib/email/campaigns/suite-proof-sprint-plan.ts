export const SUITE_PROOF_SPRINT = {
  campaignKey: "suite_proof_sprint_high_intent",
  audienceLabel: "recent SSELFIE commerce buyers without active SUITE access",
  maxAudience: 200,
  cooldownHours: 48,
  annualPriceEur: 970,
  annualCheckoutPath: "/checkout/membership?interval=year",
  successGate: {
    annualSales: 3,
    firstWeekActivations: 2,
  },
  failureGate: {
    maxAnnualSales: 1,
  },
} as const

export const SUITE_PROOF_REQUIREMENTS = [
  "one ordinary source selfie Sandra approves for this campaign",
  "three connected SSELFIE results made from that identity source",
  "one specific sentence about where or how the photos were used",
] as const

export type SuiteProofAsset = {
  imageUrl?: string
  imageAlt?: string
  useContext?: string
}

export function isSuiteProofApproved(proof?: SuiteProofAsset): boolean {
  return Boolean(
    proof?.imageUrl?.trim() && proof.imageAlt?.trim() && proof.useContext?.trim()
  )
}

export function getSuiteProofSprintCheckoutUrl(): string {
  const url = new URL(SUITE_PROOF_SPRINT.annualCheckoutPath, "https://www.sselfie.ai")
  url.searchParams.set("source", "suite_proof_sprint")
  url.searchParams.set("utm_source", "email")
  url.searchParams.set("utm_medium", "proof_sprint")
  url.searchParams.set("utm_campaign", SUITE_PROOF_SPRINT.campaignKey)
  url.searchParams.set("utm_content", "annual_suite")
  return url.toString()
}
