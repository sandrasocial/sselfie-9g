const CANONICAL_SITE_URL = "https://www.sselfie.ai"

export type EmailImageAsset = {
  path: `/images/email/${string}`
  alt: string
  intendedUse: string
  recommendedEmails: string[]
  notes: string
}

export const EMAIL_IMAGE_ASSETS = {
  prompt_pack_hero: {
    path: "/images/email/prompt-pack-hero.jpg",
    alt: "Sandra in a cinematic street-style personal brand photo created from an AI prompt workflow.",
    intendedUse: "PROMPT pack delivery and nurture emails where the promise is AI photos that still feel personal and high-end.",
    recommendedEmails: ["AI Prompts Pack delivery", "AI Prompts nurture", "Prompt-to-Starter Kit bridge"],
    notes: "Use when the email needs to show the visual possibility behind the prompt funnel.",
  },
  starter_kit_ai_ready_selfie: {
    path: "/images/email/starter-kit-ai-ready-selfie.jpg",
    alt: "A polished close-up selfie with warm light and a high-end personal brand feel.",
    intendedUse: "Starter Kit emails that explain how stronger selfies create stronger AI visual results.",
    recommendedEmails: ["Starter Kit sales bridge", "Starter Kit delivery", "Starter Kit nurture"],
    notes: "Best for positioning the Starter Kit as the first step into AI-ready personal brand visuals.",
  },
  selfie_guide_foundation: {
    path: "/images/email/selfie-guide-foundation.jpg",
    alt: "Sandra standing by a window in a clean editorial phone photo with natural light.",
    intendedUse: "Free Selfie Guide emails about light, posing, and getting one strong original photo.",
    recommendedEmails: ["Free Selfie Guide delivery", "Free Selfie Guide Day 1", "Free Selfie Guide Day 3"],
    notes: "Use when the message is about phone-first photo fundamentals and natural light.",
  },
  studio_visual_workspace: {
    path: "/images/email/studio-visual-workspace.jpg",
    alt: "Sandra sitting in a bright luxury interior with coffee, creating a high-end personal brand workspace mood.",
    intendedUse: "Studio or Maya emails that need to show the ongoing execution layer as calm, premium, and visual.",
    recommendedEmails: ["Studio nurture", "Maya onboarding", "Masterclass-to-Studio bridge"],
    notes: "Use for Studio positioning, not as the first Starter Kit proof image.",
  },
} as const satisfies Record<string, EmailImageAsset>

export type EmailImageAssetKey = keyof typeof EMAIL_IMAGE_ASSETS

function normalizeSiteUrl(siteUrl?: string): string {
  const configured = (siteUrl || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || CANONICAL_SITE_URL).trim()
  const withoutTrailingSlash = configured.replace(/\/+$/, "")

  if (!withoutTrailingSlash || withoutTrailingSlash === "https://sselfie.ai") {
    return CANONICAL_SITE_URL
  }

  return withoutTrailingSlash
}

export function getEmailImageUrl(key: EmailImageAssetKey, siteUrl?: string): string {
  const asset = EMAIL_IMAGE_ASSETS[key]
  return `${normalizeSiteUrl(siteUrl)}${asset.path}`
}

export function getEmailImageAsset(key: EmailImageAssetKey, siteUrl?: string): EmailImageAsset & { key: EmailImageAssetKey; url: string } {
  const asset = EMAIL_IMAGE_ASSETS[key]

  return {
    key,
    ...asset,
    url: getEmailImageUrl(key, siteUrl),
  }
}

export function getEmailHeroImage(key: EmailImageAssetKey, siteUrl?: string): { heroImageUrl: string; heroImageAlt: string } {
  const asset = getEmailImageAsset(key, siteUrl)

  return {
    heroImageUrl: asset.url,
    heroImageAlt: asset.alt,
  }
}
