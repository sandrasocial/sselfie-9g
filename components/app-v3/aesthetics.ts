// SSELFIE Studio 3.0 - Visual Front Door data.
// Derives the aesthetic tiles from the existing Prompt Vault collections so the grid
// always reflects the real vault. Backend reuse only (lib import, no UI coupling).

import { VAULT_COLLECTION_META } from "@/lib/ai-prompts/prompt-data"
import type { Aesthetic } from "./types"

/** Neutral creative state: no Vault world or typography has been chosen yet. */
export const MAYA_GENERAL_AESTHETIC: Aesthetic = {
  id: "maya-general",
  name: "SSELFIE",
  blurb: "Let's make something that's truly you.",
  coverImage: "",
  thumbnails: [],
  shotCount: 0,
  intent:
    "A general SSELFIE editorial brand session. Help her decide the look from her brand, then create.",
}

/**
 * The quiet default for Maya-first creation. This is intentionally not a
 * synthetic visual style: it tells the chat route to choose one real Vault
 * direction from the member's request and saved brand context.
 */
export const MAYA_DECIDES_AESTHETIC: Aesthetic = {
  id: "maya-decides",
  name: "Maya recommends",
  blurb: "Maya recommends the strongest SSELFIE look for what you need today.",
  coverImage: "",
  thumbnails: [],
  shotCount: 0,
  intent:
    "Recommend the single strongest SSELFIE Vault world using her request, memory, brand profile, and recent activity. Explain the recommendation simply, then keep the result inside that real Vault world.",
}

/** Turn a collection name like "Quiet Luxury London Editorial" into a stable id. */
function toId(name: string): string {
  return name
    .toLowerCase()
    .replace(/editorial$/i, "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Trim the trailing "Editorial" for a cleaner display name. */
function toDisplayName(name: string): string {
  return name.replace(/\s*Editorial\s*$/i, "").trim()
}

/** A short, on-brand vibe line per aesthetic. Falls back to a calm default. */
const BLURBS: Record<string, string> = {
  "quiet-luxury-london": "Soft tailoring, marble, and morning light.",
  "mysterious-vogue": "Editorial half-light and quiet drama.",
  "noir-femme": "Low-key, cinematic, all confidence.",
  "clean-girl-founder-morning": "Fresh, effortless, founder-at-home calm.",
  "dark-feminine-cafe-coffee-run": "Café light, dark coats, slow mornings.",
}

/** The intent string handed to Maya + the prompt compiler when a vibe is chosen. */
const INTENTS: Record<string, string> = {
  "quiet-luxury-london":
    "Quiet luxury editorial: neutral palette, refined tailoring, natural window light, calm composition.",
  "mysterious-vogue":
    "Mysterious Vogue editorial: dramatic half-light, deep shadow, magazine-cover framing.",
  "noir-femme": "Noir femme editorial: low-key cinematic lighting, moody tones, strong silhouette.",
  "clean-girl-founder-morning":
    "Clean-girl founder morning: soft daylight, minimal styling, natural skin, at-home calm.",
  "dark-feminine-cafe-coffee-run":
    "Dark feminine café: warm café light, dark outerwear, candid coffee-run movement.",
}

export const AESTHETICS: Aesthetic[] = VAULT_COLLECTION_META.map((c): Aesthetic => {
  const id = toId(c.name)
  return {
    id,
    name: toDisplayName(c.name),
    blurb: BLURBS[id] ?? "An editorial brand-shoot look from the SSELFIE Vault.",
    coverImage: c.thumbnails[0] ?? "",
    thumbnails: c.thumbnails.slice(0, 4),
    shotCount: c.shotCount,
    shots: c.thumbnails.map((image, index) => ({
      id: `${id}-shot-${index + 1}`,
      title: `${toDisplayName(c.name)} · Shot ${index + 1}`,
      image,
    })),
    intent:
      INTENTS[id] ??
      `${toDisplayName(c.name)} editorial look: connected styling, refined light, brand-shoot quality.`,
  }
}).filter(a => a.coverImage.length > 0)

export function getAestheticById(id: string): Aesthetic | undefined {
  return AESTHETICS.find(a => a.id === id)
}
