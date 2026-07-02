// LIKENESS-MEMORY-01 - the likeness-memory loop for /app (SUITE members).
//
// The 2026-07 member pulse showed 7 of 22 all-time edit requests are likeness corrections
// ("head too big", "my hair is dark brown not black", "add my mole") and members repeat the
// SAME corrections every session because nothing persists them. This module is the pure logic
// layer: a cheap pattern classifier that spots a likeness correction in an edit instruction,
// normalizes it into a durable note, dedupes the note list, and renders the identity block
// injected into every generation and edit prompt.
//
// Doctrine guard: likeness notes are about ACCURACY, never beautification. A vanity ask
// ("make me thinner", "flawless skin") is NEVER stored as a likeness note; the edit route's
// existing doctrine append handles those in-flight. AI should not erase you. It should frame you.
//
// Storage lives in lib/app-v3/maya/memory-store.ts (app_v3_memory.likeness_notes jsonb).
// Kill switch: APP_V3_LIKENESS_MEMORY_ENABLED (house style: default OFF, "true"/"1"/"on" enables).

/** Flag-gated capture + injection. Default OFF until Sandra flips the env in Vercel. */
export function isLikenessMemoryEnabled(): boolean {
  const value = (process.env.APP_V3_LIKENESS_MEMORY_ENABLED || "").trim().toLowerCase()
  return value === "1" || value === "true" || value === "on"
}

// Vanity-drift asks ("flawless", "make me slimmer/younger") get a doctrine guard appended in the
// edit route: her at her natural best, never a different face or body. Shared here so the note
// classifier and the edit prompt use the exact same line. Moved verbatim from the edit route.
export const VANITY_DRIFT_PATTERN =
  /\b(flawless|perfect|younger|slimmer|thinner|airbrush|photoshop)\w*/i

// Body/identity vocabulary: the parts of HER a correction can be about. Clothing, background,
// and brightness asks never match this, so ordinary styling edits are never stored.
const LIKENESS_SUBJECT =
  /\b(face|head|neck|forehead|nose|chin|jaw(?:line)?|cheeks?|cheekbones?|eyes?|eyebrows?|brows|lashes|lips?|mouth|teeth|tooth|smile|dimples?|moles?|freckles?|scars?|birthmarks?|beauty marks?|glasses|skin tone|complexion|hair(?:line)?|curls?|bangs|fringe|body|figure|proportions?|shoulders?|arms?|hands?|legs?|torso|waist|height|tall(?:er)?|short(?:er)?)\b/i

// Corrective phrasing: she is telling us the render got HER wrong, not asking for a new style.
// "make my hair blonde" (styling ask) has no corrective signal and is not captured.
const CORRECTIVE_SIGNAL =
  /\b(not|isn'?t|aren'?t|doesn'?t|don'?t|wasn'?t|wrong|actually|in real life|real me|should be|supposed to|keep my|match my|my real|too (?:big|small|long|short|wide|narrow|tall|thin|round|square|full|stretched|elongated)|stretched(?: out)?|add my|missing my|remove|without my|i (?:have|wear|don'?t wear|do not wear)|(?:is|are|looks?|seems?) (?:bigger|smaller|wider|narrower|longer|shorter|rounder|darker|lighter))\b/i

// Direct likeness complaints qualify on their own, no subject word needed.
const DIRECT_LIKENESS =
  /\b(doesn'?t look like me|does not look like me|looks? nothing like me|that'?s not me|not my (?:face|nose|hair|smile|body|chin|jaw|eyes))\b/i

const MAX_NOTE_LENGTH = 160
export const MAX_LIKENESS_NOTES = 20

export type LikenessCategory =
  | "hair"
  | "marks"
  | "glasses"
  | "smile"
  | "eyes"
  | "skin tone"
  | "proportions"
  | "face"
  | "likeness"

export interface LikenessClassification {
  isLikeness: boolean
  /** True when the ask is a vanity/beautification request (never stored as a note). */
  isVanity: boolean
  /** Normalized durable note ("hair: my hair is dark brown not black"), null when not likeness. */
  note: string | null
  category: LikenessCategory | null
}

function likenessCategory(instruction: string): LikenessCategory {
  const t = instruction.toLowerCase()
  if (/hair|curls?|bangs|fringe/.test(t)) return "hair"
  if (/moles?|freckles?|scars?|birthmarks?|beauty marks?|dimples?/.test(t)) return "marks"
  if (/glasses/.test(t)) return "glasses"
  if (/teeth|tooth|smile/.test(t)) return "smile"
  if (/eyes?|eyebrows?|brows|lashes/.test(t)) return "eyes"
  if (/skin tone|complexion/.test(t)) return "skin tone"
  if (/body|figure|proportions?|height|tall|short|torso|waist|shoulders?|arms?|legs?|stretched/.test(t))
    return "proportions"
  if (/face|head|neck|nose|chin|jaw|cheeks?|forehead|lips?|mouth/.test(t)) return "face"
  return "likeness"
}

/** Trim, collapse whitespace, strip trailing punctuation, cap length. */
function cleanInstruction(instruction: string): string {
  return instruction
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?\s]+$/g, "")
    .slice(0, MAX_NOTE_LENGTH)
}

/**
 * Cheap pattern classifier (no LLM call: the edit route goes straight to images.edit, so there
 * is nothing to piggyback on). A likeness correction needs a direct complaint OR a body/identity
 * subject plus corrective phrasing. Vanity asks are excluded before anything else.
 */
export function classifyLikenessCorrection(instruction: string): LikenessClassification {
  const text = typeof instruction === "string" ? instruction.trim() : ""
  if (!text) return { isLikeness: false, isVanity: false, note: null, category: null }
  if (VANITY_DRIFT_PATTERN.test(text)) {
    return { isLikeness: false, isVanity: true, note: null, category: null }
  }
  const direct = DIRECT_LIKENESS.test(text)
  const subjectAndCorrection = LIKENESS_SUBJECT.test(text) && CORRECTIVE_SIGNAL.test(text)
  if (!direct && !subjectAndCorrection) {
    return { isLikeness: false, isVanity: false, note: null, category: null }
  }
  const category = likenessCategory(text)
  const cleaned = cleanInstruction(text)
  if (!cleaned) return { isLikeness: false, isVanity: false, note: null, category: null }
  return { isLikeness: true, isVanity: false, note: `${category}: ${cleaned}`, category }
}

export interface LikenessUpsertResult {
  notes: string[]
  /** A brand-new note was appended. */
  added: boolean
  /** The same normalized note already existed; refreshed in place, not duplicated. */
  updated: boolean
}

/**
 * Dedupe rule: the same normalized note is never stored twice for a user. A repeat moves the
 * note to the end (most recent) instead of appending a duplicate. The list is capped at
 * MAX_LIKENESS_NOTES, dropping the oldest, so the prompt block stays bounded.
 */
export function upsertLikenessNote(existing: string[], note: string): LikenessUpsertResult {
  const clean = note.trim()
  if (!clean) return { notes: existing, added: false, updated: false }
  const key = clean.toLowerCase()
  const kept = existing.filter(n => n.trim().toLowerCase() !== key)
  const updated = kept.length !== existing.length
  const notes = [...kept, clean].slice(-MAX_LIKENESS_NOTES)
  return { notes, added: !updated, updated }
}

/**
 * The identity block appended to every generation and edit prompt (flag-gated at the routes).
 * Accuracy language only: keep her recognizable and true to the real person, never "improve" her.
 */
export function buildLikenessPromptBlock(notes: string[]): string {
  const clean = notes.map(n => n.trim()).filter(Boolean)
  if (clean.length === 0) return ""
  return [
    "Known likeness corrections from this member. She has corrected these before, always honor them:",
    ...clean.map(n => `- ${n}`),
    "These notes are about accuracy, not beautification. Keep her real facial structure, natural skin texture, body proportions, and age. She must stay clearly recognizable as the same real woman.",
  ].join("\n")
}
