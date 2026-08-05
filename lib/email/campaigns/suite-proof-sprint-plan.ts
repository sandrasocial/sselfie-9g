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

export type SuiteProofImage = {
  imageUrl: string
  imageAlt: string
}

export type SuiteProofAsset = {
  sourceImage?: SuiteProofImage
  resultImages?: readonly SuiteProofImage[]
  carouselImages?: readonly SuiteProofImage[]
  useContext?: string
  tutorialUrl?: string
}

export function isSuiteProofApproved(proof?: SuiteProofAsset): boolean {
  const sourceReady = Boolean(
    proof?.sourceImage?.imageUrl.trim() && proof.sourceImage.imageAlt.trim()
  )
  const resultImages = proof?.resultImages?.filter(
    image => image.imageUrl.trim() && image.imageAlt.trim()
  ) || []

  return Boolean(
    sourceReady && resultImages.length >= 3 && proof?.useContext?.trim()
  )
}

export function createSuiteProofSprintReviewProof(
  assetOrigin = "https://sselfie.ai"
): SuiteProofAsset {
  const assetUrl = (path: string) => `${assetOrigin.replace(/\/$/, "")}${path}`

  return {
    sourceImage: {
      imageUrl: assetUrl("/campaigns/suite-proof-sprint/source-selfie.jpg"),
      imageAlt: "Sandra's original selfie from her phone camera tutorial",
    },
    resultImages: [
      {
        imageUrl: assetUrl("/campaigns/suite-proof-sprint/marbella-result-1.jpg"),
        imageAlt: "AI photo Sandra created from the original selfie while travelling in Marbella",
      },
      {
        imageUrl: assetUrl("/campaigns/suite-proof-sprint/marbella-result-2.jpg"),
        imageAlt: "AI lifestyle photo Sandra created from the same original selfie",
      },
      {
        imageUrl: assetUrl("/campaigns/suite-proof-sprint/marbella-result-3.jpg"),
        imageAlt: "AI full-length photo Sandra created from the same original selfie",
      },
    ],
    carouselImages: Array.from({ length: 8 }, (_, index) => ({
      imageUrl: assetUrl(`/campaigns/suite-proof-sprint/carousel-${index + 1}.jpg`),
      imageAlt: `Sandra's simple-content carousel, slide ${index + 1} of 8`,
    })),
    useContext:
      "I was travelling to Marbella and wanted to keep sharing my story, my style and my business without doing my hair and makeup, filming and editing every day. I used one selfie to create a connected Marbella image set, then turned the thought behind it into a carousel about showing up more simply.",
    tutorialUrl: "https://www.instagram.com/reel/DaWJo4hoB8n/",
  }
}

export const SUITE_PROOF_SPRINT_REVIEW_PROOF = createSuiteProofSprintReviewProof()

export function getSuiteProofSprintCheckoutUrl(): string {
  const url = new URL(SUITE_PROOF_SPRINT.annualCheckoutPath, "https://www.sselfie.ai")
  url.searchParams.set("source", "suite_proof_sprint")
  url.searchParams.set("utm_source", "email")
  url.searchParams.set("utm_medium", "proof_sprint")
  url.searchParams.set("utm_campaign", SUITE_PROOF_SPRINT.campaignKey)
  url.searchParams.set("utm_content", "annual_suite")
  return url.toString()
}
