// SSELFIE Studio 3.0 — app-v3 ingredient libraries.
// Salvaged from lib/maya/prompt-constructor.ts and lib/maya/direct-prompt-generation.ts.
// These are the deterministic ingredients the compiler layers into a production prompt.
// Data only — NO Flux trigger-word / tag-style helpers were ported (wrong paradigm for
// gpt-image, which is instruction-following like Nano Banana).

/**
 * Named camera bodies by positioning. Ported verbatim from prompt-constructor CAMERA_SPECS.
 * Maya picks the body that matches the concept's positioning; this map is also the fallback
 * the compiler uses if Maya's brief omits a camera spec.
 */
export const CAMERA_SPECS: Record<string, string> = {
  workout: "Canon EOS R6 Mark II, 24-70mm f/2.8 lens",
  athletic: "Canon EOS R6 Mark II, 24-70mm f/2.8 lens",
  gym: "Canon EOS R6 Mark II, 24-70mm f/2.8 lens",
  casual: "Fujifilm X-T5, 35mm f/2 lens",
  "coffee-run": "Fujifilm X-T5, 35mm f/2 lens",
  "street-style": "Canon EOS R5, 50mm f/1.8 lens",
  luxury: "Hasselblad X2D 100C, 55mm f/2.5 lens",
  travel: "Sony A7R V, 35mm f/1.4 lens",
  airport: "Sony A7R V, 35mm f/1.4 lens",
  cozy: "Fujifilm X-T5, 35mm f/2 lens",
  home: "Fujifilm X-T5, 35mm f/2 lens",
  selfie: "iPhone 15 Pro front camera, arm's length",
}

/** Default camera body when no positioning is detected and Maya supplied none. */
export const DEFAULT_CAMERA_SPEC = CAMERA_SPECS.luxury

/**
 * Named lighting setups by positioning. Ported from prompt-constructor LIGHTING_OPTIONS
 * (first, most editorial option of each set). Used as the compiler fallback.
 */
export const LIGHTING_OPTIONS: Record<string, string> = {
  workout: "bright morning sunlight creating an energetic, clean athletic mood",
  athletic: "bright morning sunlight creating an energetic, clean athletic mood",
  gym: "soft diffused gym lighting with natural window light",
  casual: "soft afternoon sunlight with a warm natural glow",
  "coffee-run": "soft afternoon sunlight with a warm natural glow",
  "street-style": "golden hour light at 5pm with long natural shadows",
  luxury: "warm late-afternoon window light with golden tones and soft natural shadows",
  travel: "natural terminal light through floor-to-ceiling windows",
  airport: "natural terminal light through floor-to-ceiling windows",
  cozy: "soft natural window light with a warm ambient glow",
  home: "soft natural window light with a warm ambient glow",
}

/** Default lighting when no positioning is detected and Maya supplied none. */
export const DEFAULT_LIGHTING = LIGHTING_OPTIONS.luxury

/**
 * The anti-plastic realism tokens. Ported verbatim from direct-prompt-generation.ts —
 * the exact string Maya's legacy prompts always ended with. This is the single biggest
 * "make it look real, not AI" lever and the compiler appends it to every photo concept.
 */
export const REALISM_TOKENS =
  "natural skin texture with pores visible, fine film grain, muted colors, candid editorial feel, not plastic, not over-smoothed"

/**
 * Elevation: SSELFIE doesn't reproduce a tired selfie, it shows the best, most confident
 * version of her. Beauty + styling + brand elevation while keeping her clearly recognizable.
 * Identity-preserving, not face-changing (stays moderation-safe and on-brand).
 */
export const ELEVATION =
  "Show the most polished, confident, editorial version of her: flattering light, refined and " +
  "healthy skin, tasteful natural makeup, great hair, elegant on-brand styling, strong posture, " +
  "magazine-quality finish. Frame her at her best while keeping her clearly recognizable as the same person. " +
  "Enhance; do not change who she is."

/**
 * The identity anchor (gpt-image rule #1). The compiler puts this on the FIRST line of every
 * prompt so the model keeps the user's likeness before anything else. This is Sandra's PROVEN
 * universal identity lock (her Pinterest Photoshoot Lab workflow), adapted to third person
 * because the server attaches the selfie via the edit endpoint. It names the features that
 * matter without the forensic words ("exact face / bone structure / strict replication") that
 * tripped OpenAI moderation. The reference defines the person; the prompt defines the styling.
 */
export const IDENTITY_ANCHOR =
  "Use the attached reference photo as the only source for her face and identity. Preserve her " +
  "facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair " +
  "color, and overall look from the reference. The reference defines the person; this prompt " +
  "defines only the styling, outfit, location, pose, mood, and editorial look. Keep the result " +
  "realistic, editorial, sharp, and clearly recognizable as the same woman. Her skin tone stays " +
  "hers, but render it under THIS scene's light - picking up its color cast, direction, and " +
  "shadow falloff exactly as a camera would see her standing there, never lit separately from " +
  "the background."

/**
 * Accessories discipline (Sandra's proven rule): the phone is the main accessory; don't over-
 * accessorize; only use brand logos when specified and naturally fitting, never random ones.
 */
export const ACCESSORIES_NOTE =
  "Use the phone as the main accessory when it fits the scene. Do not over-accessorize, simple is " +
  "better. Only include brand logos or branded items when specified and naturally fitting; never " +
  "add random logos or extra branded items."

/**
 * The universal technical avoid list (Sandra's proven workflow). Targets the artifacts that make
 * an image read as AI: warped anatomy/props, plastic over-smoothed skin, CGI, blur, compression.
 */
export const AVOID_LIST =
  "Avoid: distorted hands, extra fingers, warped phone, warped sunglasses, warped shoes, " +
  "unrealistic body proportions, plastic skin, over-smoothed beauty filter, heavy glam makeup, " +
  "cartoonish AI style, CGI, fantasy lighting, messy anatomy, blur, low-resolution softness, " +
  "compression haze, overly staged stock-photo look, cluttered props, random logos, " +
  "fake-looking brand marks, studio lighting or softbox glow in outdoor or naturally lit " +
  "scenes, a subject lit differently from her background, missing contact shadows, " +
  "pasted-in composite look, HDR over-processing."

/** Output quality + format block per aspect (Sandra's proven anti-blur rules).
 * No numeric ratio in the portrait block: the actual canvas is APP_V3_PORTRAIT_SIZE
 * (1024x1536 = 2:3 today), and claiming "9:16" while rendering 2:3 pushes composition
 * and text placement toward the wrong frame shape (gpt-image-2 research 2026-07-06:
 * conflicting aspect instructions are a documented layout weak spot). */
export const PORTRAIT_QUALITY =
  "Image quality: vertical portrait filling the full frame, 2K quality, crisp editorial sharpness, realistic depth " +
  "and detail, no blur, no low-resolution softness, no compression haze."
export const CAROUSEL_QUALITY =
  "Image quality: vertical 4:5 Instagram format, 2K quality, crisp editorial sharpness, no blur, " +
  "no low-resolution softness, no compression haze."

/**
 * The photographer doctrine (Sandra, 2026-07-07): images were reading fake because light was
 * applied like a studio grade instead of coming FROM the scene. This block makes every photo
 * behave like a real human shot it on location in real time - light sources must exist in
 * the scene, the subject moves like a person mid-moment, and the physics (shadows, grain,
 * slight motion) anchor her INTO the location instead of on top of it.
 */
export const PHOTOGRAPHER_REALISM =
  "Shoot this like a real photographer working the location in real time: light comes ONLY " +
  "from sources that actually exist in the scene - sun, sky, and weather outdoors; windows, " +
  "doorways, and practical lamps indoors. Never add studio lighting, softbox glow, rim light, " +
  "or flash to a place that would not naturally contain them. Anchor her physically in the " +
  "space: real contact shadows under feet and hands, soft ambient occlusion where her body " +
  "meets surfaces, reflected color from nearby walls and objects on her skin and clothes. Let " +
  "the frame breathe like a real capture: a caught in-between moment, natural imperfect " +
  "posture, fabric and hair responding to movement and air, a believable handheld angle, fine " +
  "film grain, and honest shadows where the scene makes them."

/**
 * Even softer identity wording used only on a content_policy retry, plus a styling note that
 * nudges the model toward a moderation-safe, classy result.
 */
export const IDENTITY_ANCHOR_SAFE =
  "Keep the person resembling the woman in the attached photo, in a natural and tasteful way. " +
  "Create a classy, fully-clothed editorial portrait with elegant, modest styling."

/**
 * Hardcoded "Quiet Luxury" fallback palette (per Sandra's spec answer). Used for the
 * on-image graphic layer when the user has no saved brand kit, so graphics always read
 * high-end. Names + hex kept aligned with the SSELFIE global palette.
 */
export const QUIET_LUXURY_FALLBACK = {
  colors: [
    "Editorial Black (#0a0a0a)",
    "Crisp White (#ffffff)",
    "Soft Cream (#f5f0e8)",
    "Charcoal (#3a3a3a)",
  ],
  fonts: ["an elegant high-contrast serif for headlines", "a clean light sans for body text"],
  vibe: "calm, spacious, premium magazine layout",
}

/** Lowercase keyword → positioning key, so we can pick camera + lighting from free text. */
const POSITIONING_KEYWORDS: { key: keyof typeof CAMERA_SPECS; patterns: RegExp }[] = [
  { key: "workout", patterns: /workout|gym|fitness|athletic|pilates|yoga|alo|lululemon|sport/i },
  { key: "travel", patterns: /airport|travel|terminal|flight|luggage/i },
  { key: "street-style", patterns: /street|urban|soho|city|sidewalk/i },
  { key: "coffee-run", patterns: /coffee|cafe|café|errand|coffee run/i },
  { key: "cozy", patterns: /cozy|hygge|home|lounge|knit|fireplace|sofa/i },
  {
    key: "luxury",
    patterns:
      /luxury|quiet luxury|editorial|the row|chanel|marble|hotel|elegant|refined|vogue|noir/i,
  },
]

/** Pick a positioning key from any free text (aesthetic intent, setting, outfit). */
export function detectPositioning(text: string): keyof typeof CAMERA_SPECS {
  for (const { key, patterns } of POSITIONING_KEYWORDS) {
    if (patterns.test(text)) return key
  }
  return "luxury"
}

/** Camera fallback for free text. */
export function cameraForText(text: string): string {
  return CAMERA_SPECS[detectPositioning(text)] ?? DEFAULT_CAMERA_SPEC
}

/** Lighting fallback for free text. */
export function lightingForText(text: string): string {
  return LIGHTING_OPTIONS[detectPositioning(text)] ?? DEFAULT_LIGHTING
}
