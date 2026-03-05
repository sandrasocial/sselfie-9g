export interface MayaLandingPageBlueprint {
  hook: string
  truth: string
  proofBullets: string[]
  ctaLabel: string
  ctaHref: string
  heroImageUrl: string
  supportImageUrls: string[]
  brandTone: string
}

export interface MayaLandingRenderInput {
  assetId: string
  title: string
  previewText: string
  checkoutUrl: string
  blueprint: MayaLandingPageBlueprint
}

export interface MayaLandingRenderResult {
  html: string
  title: string
  previewText: string
}

export type MayaCriticalLandingField = "offer" | "audience" | "transformation"
