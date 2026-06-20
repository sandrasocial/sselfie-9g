// Shared SSELFIE visual contract for Maya-generated images and admin content-kit renders.
// Keep this small and explicit so every generator can inherit the same look without drifting.

export const SSELFIE_PROMPT_VERSION = "maya-june11-restoration-v1"

export const SSELFIE_VISUAL_IDENTITY =
  "SSELFIE visual identity: premium editorial, feminine but grown-up, clean, elevated, cinematic, modern, luxury personal brand, realistic, Instagram-safe, and never childish or generic."

export const SSELFIE_NEUTRAL_PALETTE =
  "Use a restrained neutral palette only: black, white, charcoal, cream, warm gray, soft taupe, stone, and gentle skin-true neutrals."

export const SSELFIE_GRAPHIC_STYLE_PROMPT = [
  "Premium SSELFIE editorial slide: calm, spacious, high-end magazine feel.",
  SSELFIE_VISUAL_IDENTITY,
  SSELFIE_NEUTRAL_PALETTE,
  "Strong hierarchy, one clear headline, clean supporting type, elegant serif display type paired with a clean sans-serif.",
  "Generous negative space, refined spacing, polished mobile-first composition, text integrated into the image instead of pasted on top.",
  "No red accent palette, crimson callouts, maroon details, farmhouse mood, country-lodge styling, Canva template look, clip-art, emojis, gradients, clutter, white lesson-card layout, or generic AI poster styling.",
].join(" ")

export const SSELFIE_PHOTO_STYLE_PROMPT = [
  SSELFIE_VISUAL_IDENTITY,
  "Keep the person recognizable from the uploaded reference photos, with natural skin texture, accurate age, accurate proportions, and believable editorial styling.",
  "The image should feel like a real on-location shoot from the SSELFIE Vault, not studio stock.",
].join(" ")

export const SSELFIE_INSPIRATION_CLOSE_RECREATE = [
  "Use the inspiration image as a close composition and styling target for this first result.",
  "Recreate the pose, framing, wardrobe energy, lighting direction, color grade, and mood as closely as the user's chosen aesthetic allows.",
  "This should feel like: the inspiration photo, but as the user.",
  "Identity priority: the uploaded selfies are the only source for the user's face, age, body proportions, skin texture, and recognizable identity. Do not copy or blend the inspiration person's face.",
].join("\n")

export const SSELFIE_INSPIRATION_SET_VARIATION = [
  "Use the inspiration image as the style world for this photoshoot set.",
  "Stay close to its wardrobe energy, lighting direction, color grade, mood, and composition language, while varying this shot's role and angle.",
  "Identity priority: the uploaded selfies are the only source for the user's face, age, body proportions, skin texture, and recognizable identity. Do not copy or blend the inspiration person's face.",
].join("\n")
