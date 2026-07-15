import type { LikenessClassification } from "@/lib/app-v3/likeness-memory"

export type LikenessCaptureDecision = "capture" | "offer" | "ignore"

/**
 * Presentation-only confidence split. The frozen classifier still decides whether an
 * instruction is a likeness correction. A broad "that isn't me" note asks permission;
 * a concrete hair/eyes/marks correction can be safely captured and acknowledged.
 */
export function decideLikenessCapture(
  classification: LikenessClassification
): LikenessCaptureDecision {
  if (!classification.isLikeness || classification.isVanity || !classification.note) return "ignore"
  return classification.category === "likeness" ? "offer" : "capture"
}

function humanizeLikenessNote(note: string): string {
  const withoutCategory = note.replace(/^[^:]+:\s*/, "").trim()
  const memberFacing = withoutCategory
    .replace(/^my\b/i, "your")
    .replace(/\bmy\b/gi, "your")
    .replace(/\s+not\s+/i, ", not ")
  return memberFacing.charAt(0).toUpperCase() + memberFacing.slice(1)
}

export function buildLikenessAcknowledgement(note: string): string {
  if (/^likeness:\s*/i.test(note)) {
    return "Noted. I’ll use that feedback to keep every future photo true to you."
  }
  return `Noted. ${humanizeLikenessNote(note)}. I’ll keep that true in every photo from now on.`
}
