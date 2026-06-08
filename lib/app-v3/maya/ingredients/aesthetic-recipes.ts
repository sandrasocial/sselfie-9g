// SSELFIE Studio 3.0 — Aesthetic Recipes (MAYA-REBUILD-04: vision-extracted DNA).
//
// These tokens were reverse-engineered by looking at the actual Vault thumbnails
// (public/images/ai-prompts/<style>-shot-1.*) with multimodal vision, NOT guessed from the
// style's name. Each recipe captures the three things a name can't: COLOR GRADING, the
// LIGHTING SETUP, and the CAMERA / FILM TEXTURE. The compiler injects these so gpt-image
// reproduces the exact look of the collection instead of a generic interpretation.
//
// Keyed by the same id the Visual Front Door produces (components/app-v3/aesthetics.ts toId()),
// matched loosely so accent/spelling drift (e.g. "café" -> "caf") still resolves.

export interface AestheticRecipe {
  /** Canonical id (matches the front-door aesthetic id where possible). */
  id: string
  /** Human label for logs/debugging. */
  name: string
  /** Color palette + grade: hues, saturation, contrast, finish. */
  colorGrading: string
  /** The lighting setup: source, direction, hardness, shadow behavior. */
  lighting: string
  /** Camera body feel + film/sensor texture + framing tendency. */
  cameraFilm: string
}

// Source thumbnail noted per entry for traceability.
const RECIPES: (AestheticRecipe & { match: RegExp })[] = [
  {
    id: "quiet-luxury-london",
    name: "Quiet Luxury London",
    match: /quiet-luxury-london/,
    // from quiet-luxury-london-shot-1.jpg
    colorGrading:
      "cool, desaturated greige-and-taupe palette, low contrast, soft matte finish, a faint cool grey cast, no bold color",
    lighting:
      "flat overcast daylight, soft and even, gentle wraparound shadows, no harsh highlights",
    cameraFilm:
      "35mm full-frame editorial street photography, fine natural film grain, true-to-life skin, crisp yet soft, shallow depth of field, full-body framing on a Parisian pavement",
  },
  {
    id: "mysterious-vogue",
    name: "Mysterious Vogue",
    match: /mysterious-vogue/,
    // from mysterious-vogue-shot-1.png
    colorGrading:
      "warm skin tones emerging from a near-black surround, deep rich contrast, muted saturation everywhere except the lit skin",
    lighting:
      "a single hard directional key light raking across one side of the face (chiaroscuro / Rembrandt), everything else falling into deep shadow",
    cameraFilm:
      "tight beauty-editorial portrait crop, high micro-detail skin texture with visible pores, medium-format clarity, very subtle grain",
  },
  {
    id: "noir-femme",
    name: "Noir Femme",
    match: /noir-femme/,
    // from noir-femme-shot-1.png
    colorGrading:
      "high-contrast black-and-white monochrome, deep crushed blacks, luminous silver highlights, full tonal range, zero color",
    lighting:
      "soft directional daylight with strong tonal separation, dramatic but natural, sculpting the silhouette",
    cameraFilm:
      "cinematic 35mm film-noir, visible silver-halide grain, full-body editorial motion with flowing fabric against old stone and cobblestone",
  },
  {
    id: "clean-girl-founder-morning",
    name: "Clean Girl Founder Morning",
    match: /clean-girl(-founder)?-morning/,
    // from clean-girl-morning-shot-1.jpg
    colorGrading:
      "bright high-key, warm-neutral whites and creams, airy low contrast, gently lifted shadows, soft and clean",
    lighting:
      "abundant soft natural window light, even and flattering, no harsh shadows, daylight white balance",
    cameraFilm:
      "authentic iPhone front-camera / mirror-selfie aesthetic, natural dewy skin, true colors, lightly soft focus, relaxed at-home framing",
  },
  {
    id: "dark-feminine-cafe-coffee-run",
    name: "Dark Feminine Café Coffee-Run",
    // tolerate the accent-stripped id ("...caf-coffee-run") the front door produces
    match: /dark-feminine-caf/,
    // from dark-feminine-cafe-shot-1.jpg
    colorGrading:
      "moody low-key with warm amber accents, rich blacks, warm highlights from interior lights, cinematic warm-shadow grade",
    lighting:
      "dim warm ambient café light with directional warm highlights and low fill, atmospheric and intimate",
    cameraFilm:
      "cinematic full-body editorial street, 35mm, gentle grain, shallow depth of field, polished but moody, dark marble and brass surroundings",
  },
]

/** Resolve a recipe from an aesthetic id (loose match), or null if none is known. */
export function getAestheticRecipe(id?: string | null): AestheticRecipe | null {
  if (!id) return null
  const key = id.toLowerCase().trim()
  const hit = RECIPES.find((r) => r.match.test(key))
  if (!hit) return null
  const { match, ...recipe } = hit
  return recipe
}

/**
 * Render a recipe as a compact, gpt-image-ready directive block. This is what the compiler
 * appends as the authoritative look layer (color grading + lighting + camera/film texture).
 */
export function recipeToPromptBlock(recipe: AestheticRecipe): string {
  return (
    `Aesthetic grade (${recipe.name}) — match this look exactly: ` +
    `Color grading: ${recipe.colorGrading}. ` +
    `Lighting: ${recipe.lighting}. ` +
    `Camera and film texture: ${recipe.cameraFilm}.`
  )
}
