import { STUDIO_CHECKOUT_URL } from "@/lib/maya/page-generation/constants"
import type { MayaLandingSnapshotResolution } from "@/lib/maya/page-generation/snapshot-resolver"
import type { MayaLandingPageBlueprint } from "@/lib/maya/page-generation/types"
import {
  clampProofBullets,
  containsBannedPhrase,
  hasMarkdownArtifacts,
  sanitizeCtaHref,
  sanitizeCtaLabel,
  sanitizeHeadline,
  sanitizePreview,
  sanitizeUserFacingText,
} from "@/lib/maya/page-generation/sanitizers"

export interface MayaLandingCopyComposeInput {
  instruction: string
  snapshot: MayaLandingSnapshotResolution
  heroImageUrl: string
  supportImageUrls: string[]
}

export interface MayaLandingCopyComposeResult {
  title: string
  previewText: string
  blueprint: MayaLandingPageBlueprint
}

function sentenceCase(value: string): string {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function buildHook(snapshot: MayaLandingSnapshotResolution): string {
  const transformation = sanitizeUserFacingText(snapshot.resolvedTransformation, 96)
  const offer = sanitizeUserFacingText(snapshot.resolvedOffer, 72)

  if (transformation) {
    const short = transformation.split(/[.!?]/)[0].split(" ").slice(0, 11).join(" ")
    return sanitizeHeadline(short)
  }

  if (offer) {
    return sanitizeHeadline(`${offer} that sounds like you`)
  }

  return "Build your next offer with Maya"
}

function buildTruth(snapshot: MayaLandingSnapshotResolution): string {
  const offer = snapshot.resolvedOffer || "your signature offer"
  const audience = snapshot.resolvedAudience || "your audience"
  const transformation = snapshot.resolvedTransformation || "a clear result they can trust"

  const truth =
    `You are building ${offer} for ${audience}. ` +
    `This page frames the promise clearly: ${transformation}. ` +
    `Everything stays aligned to your profile, your tone, and your visuals.`

  return sanitizeUserFacingText(sentenceCase(truth), 340)
}

function parseProofBullets(snapshot: MayaLandingSnapshotResolution): string[] {
  const proofSource = snapshot.resolvedProofPoints
  if (!proofSource) {
    return [
      "Structured from your saved brand profile and offer brief.",
      "Built with your own visuals from gallery and brand assets.",
      "One clear CTA so visitors know exactly what to do next.",
    ]
  }

  const parsed = proofSource
    .split(/\||;|\n|•|\*/g)
    .map((item) => sanitizeUserFacingText(item, 140))
    .filter(Boolean)

  if (parsed.length === 0) {
    return [
      "Built from your current offer context and stored preferences.",
      "Copy and layout are aligned to your locked voice rules.",
    ]
  }

  return clampProofBullets(parsed, 3)
}

function buildCta(snapshot: MayaLandingSnapshotResolution): { label: string; href: string } {
  const rawCta = snapshot.resolvedCta
  const offer = (snapshot.resolvedOffer || "").toLowerCase()

  const fallbackLabel = offer.includes("membership")
    ? "Join Studio"
    : offer.includes("coaching")
      ? "Book Strategy Call"
      : "Get The Offer Guide"

  const label = sanitizeCtaLabel(rawCta || fallbackLabel)
  const href = sanitizeCtaHref(STUDIO_CHECKOUT_URL, STUDIO_CHECKOUT_URL)

  return {
    label,
    href,
  }
}

function validateBlueprint(blueprint: MayaLandingPageBlueprint): string[] {
  const errors: string[] = []

  if (!blueprint.hook || hasMarkdownArtifacts(blueprint.hook)) {
    errors.push("hook_invalid")
  }

  if (!blueprint.truth || hasMarkdownArtifacts(blueprint.truth)) {
    errors.push("truth_invalid")
  }

  if (blueprint.proofBullets.length === 0 || blueprint.proofBullets.length > 3) {
    errors.push("proof_invalid")
  }

  if (!blueprint.ctaLabel || !blueprint.ctaHref) {
    errors.push("cta_missing")
  }

  const joinedCopy = [blueprint.hook, blueprint.truth, ...blueprint.proofBullets, blueprint.ctaLabel].join(" ")
  if (containsBannedPhrase(joinedCopy)) {
    errors.push("banned_phrase")
  }

  return errors
}

export function composeMayaLandingCopy(input: MayaLandingCopyComposeInput): MayaLandingCopyComposeResult {
  const hook = buildHook(input.snapshot)
  const truth = buildTruth(input.snapshot)
  const proofBullets = parseProofBullets(input.snapshot)
  const cta = buildCta(input.snapshot)

  const blueprint: MayaLandingPageBlueprint = {
    hook,
    truth,
    proofBullets,
    ctaLabel: cta.label,
    ctaHref: cta.href,
    heroImageUrl: input.heroImageUrl,
    supportImageUrls: input.supportImageUrls.slice(0, 2),
    brandTone: sanitizeUserFacingText(input.snapshot.resolvedStyle || "Scandinavian luxury", 80),
  }

  const errors = validateBlueprint(blueprint)
  if (errors.length > 0) {
    const fallbackBlueprint: MayaLandingPageBlueprint = {
      hook: "Build your next offer with clarity",
      truth:
        "This page is structured from your saved brand context and keeps one clear path to conversion.",
      proofBullets: [
        "Your visual style and message are kept consistent.",
        "Only one primary CTA is shown to reduce friction.",
      ],
      ctaLabel: "Join Studio",
      ctaHref: STUDIO_CHECKOUT_URL,
      heroImageUrl: input.heroImageUrl,
      supportImageUrls: input.supportImageUrls.slice(0, 2),
      brandTone: "Scandinavian luxury",
    }

    return {
      title: "Landing Page",
      previewText: sanitizePreview("Drafted a clear landing page structure with one CTA and on-brand voice."),
      blueprint: fallbackBlueprint,
    }
  }

  const title = sanitizeHeadline(`Landing Page: ${hook}`)
  const previewText = sanitizePreview(
    `Drafted a high-converting page for ${input.snapshot.resolvedOffer || "your offer"} with clear promise, proof, and CTA.`,
  )

  return {
    title,
    previewText,
    blueprint,
  }
}
