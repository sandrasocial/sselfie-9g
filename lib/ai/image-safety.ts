import "server-only"

/**
 * True when an OpenAI images.edit/images.generate error looks like a moderation / content-policy
 * rejection (as opposed to a network/quota/generic failure).
 */
export function isContentPolicyError(error: unknown): boolean {
  const candidate = error as { message?: unknown; code?: unknown; type?: unknown }
  const haystack = [
    error instanceof Error ? error.message : candidate?.message,
    candidate?.code,
    candidate?.type,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase()
  return (
    haystack.includes("content_policy") ||
    haystack.includes("content policy") ||
    haystack.includes("safety") ||
    haystack.includes("moderation") ||
    haystack.includes("violat") ||
    haystack.includes("rejected") ||
    haystack.includes("not allowed")
  )
}

/**
 * Soften a compiled prompt for a single content-policy retry. Consolidated 2026-07-05 from two
 * lists that had grown independently with different coverage (shoot-generator.ts's neckline/
 * proportion euphemisms vs. app-v3 generate route's explicit wardrobe-word swap) plus a NEW
 * setting/pose list. The gap the two old lists shared: both only touched wardrobe/body wording,
 * never the SCENE (bed, bathroom, "getting undressed") - the story-sequence format's real
 * personal-narrative content hit that gap directly (safety_violations=[sexual] with no wardrobe
 * trigger word present at all).
 */
export function sanitizePromptForImageSafety(prompt: string): string {
  return (
    prompt
      // Neckline / cut / proportion euphemisms (Shoot Studio's proven, incident-tuned list).
      .replace(/string\s+bikini(?:\s+top)?/gi, "modest sleeveless top")
      .replace(/deep\s+v\s+neckline/gi, "modest rounded neckline")
      .replace(/off[-\s]?shoulder(?:ed)?/gi, "covered bateau-neck")
      .replace(/strapless/gi, "covered sleeveless")
      .replace(/bardot\s+neckline/gi, "covered bateau neckline")
      .replace(/low[-\s]?cut/gi, "modest cut")
      .replace(/plunging\s+neckline/gi, "modest neckline")
      .replace(/bare\s+shoulders?/gi, "covered shoulders")
      .replace(/open\s+back/gi, "covered back")
      .replace(/halter\s+dress/gi, "sleeveless linen midi dress with a modest neckline")
      .replace(/mid-thigh/gi, "midi length")
      .replace(/mid-chest/gi, "upper torso")
      .replace(/near the chest/gi, "near the shoulder")
      .replace(/from chest to head/gi, "from upper torso to head")
      .replace(/nude pink lips/gi, "soft neutral pink lips")
      .replace(/natural skin texture/gi, "natural complexion texture")
      .replace(/skin tones?/gi, "complexion tones")
      .replace(/skin looks/gi, "complexion looks")
      .replace(/plastic skin/gi, "over-smoothed complexion")
      .replace(/body proportions/gi, "natural proportions")
      .replace(/head-to-body ratio/gi, "natural overall proportion")
      .replace(/body angled/gi, "person angled")
      .replace(
        /shoulders proportional to hips and torso/gi,
        "shoulders and torso naturally proportioned"
      )
      .replace(/shoulders proportional to torso/gi, "shoulders naturally proportioned")
      .replace(/shoulder width proportional/gi, "shoulder width natural")
      .replace(/\bhips\b/gi, "frame")
      .replace(/\bchest\b/gi, "upper torso")
      .replace(/\bthigh\b/gi, "leg")
      .replace(/intimate/gi, "quiet")
      .replace(/\bsultry\b/gi, "relaxed")
      .replace(/\b(?:lying\s+)?face[-\s]down\b/gi, "resting comfortably")
      .replace(/\bworn\s+open(?:\s+over)?\b/gi, "layered over")
      .replace(/\bbralette\b/gi, "modest camisole")
      // Explicit wardrobe/state words (app-v3's original list).
      .replace(
        /\b(sheer|see-?through|lace|lingerie|bodysuit|bikini|swimsuit|underwear|undergarment|bra|cleavage|topless|nude|naked|bare(?:\s+(?:skin|legs))?|body-conscious|wet)\b/gi,
        "elegant"
      )
      // NEW (2026-07-05): setting/pose words that read as sexual even with tasteful wardrobe
      // language and no explicit garment word present at all - the exact gap the two lists
      // above shared. Found via two real story-sequence rejections (safety_violations=[sexual])
      // where personal-narrative content (her real life, per the Story Bank rebuild) likely
      // drifted into a bed/bathroom moment without tripping any wardrobe-word check.
      .replace(
        /\b(in bed|on the bed|in the bedroom|the bedroom|in the bathtub|in the shower|only a towel|wrapped in a towel|getting undressed|undressing|changing clothes|sensual|seductive)\b/gi,
        "in her living room, fully dressed"
      ) + "\nKeep the styling modest, fully clothed, elegant, and tasteful."
  )
}
