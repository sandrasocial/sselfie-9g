export const SSELFIE_COMPANY_KERNEL_PATH =
  "docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md" as const

export const SSELFIE_COMEBACK_PHASE = {
  id: "connected-comeback",
  status: "active",
  startedOn: "2026-08-09",
  primaryEngine: "owned-commerce",
  mayaBroadExpansion: "paused",
  publicTierExpansion: "paused",
  outwardApproval: "required",
} as const

export const SSELFIE_COMEBACK_ENGINES = [
  {
    id: "owned-commerce",
    name: "Owned-product commerce",
    role: "cash-and-buyer engine",
    currentMove: "Run one coordinated Prompt Vault campaign using existing proof and fulfillment.",
  },
  {
    id: "maya-recurring",
    name: "Maya recurring membership",
    role: "compounding-revenue engine",
    currentMove: "Prove the one-selfie-to-finished-post job with 20 qualified buyers before expanding tiers.",
  },
  {
    id: "media-ip",
    name: "Creator media, partnerships, and licensing",
    role: "leveraged-upside engine",
    currentMove: "Prepare a qualified pipeline and proof assets without autonomous outreach.",
  },
] as const

export const SSELFIE_REVENUE_PORTFOLIO = {
  media: {
    name: "Media engine",
    currentOffer: "SSELFIE Tutorial Partnership",
    status: "unproven-secondary-engine",
  },
  software: {
    name: "Software engine",
    currentOffer: "SSELFIE SUITE",
    foundingHypothesis: "SSELFIE Visibility Partner",
    status: "active-validation-engine",
  },
  ip: {
    name: "IP engine",
    currentOffer: "AI Visibility Lab",
    status: "unproven-secondary-engine",
  },
  commerce: {
    name: "Commerce base",
    currentOffers: ["Prompt Vault", "Starter Kit", "Presets"],
    status: "active-primary-engine",
  },
} as const

export const PRIVATE_HIGH_VALUE_OFFERS = [
  "SSELFIE Tutorial Partnership",
  "SSELFIE Visibility Partner",
  "AI Visibility Lab",
  "keynote",
  "license",
] as const
