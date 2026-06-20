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
  "TASK TYPE: IMAGE RECONSTRUCTION.",
  "The inspiration image is the visual blueprint, not a loose mood board and not a prose suggestion.",
  "Recreate the exact visual relationships from the inspiration image: crop, composition, framing, camera distance, lens perspective, subject scale, pose geometry, expression energy, wardrobe/props that are visibly present, lighting direction, shadow shape, shadow position, shadow intensity, shadow edge softness, background tone, brightness gradient, depth, texture, color grade, and mood.",
  "Only replace the person with the identity from the uploaded identity reference images.",
  "Use the uploaded identity reference images as the ONLY source of facial identity.",
  "Identity Priority: 100%. Preserve the person's facial structure, eye shape, brow shape, nose shape, jawline, lips, cheekbones, skin texture, pores, age markers, natural age, body proportions, hair color, and recognizable identity.",
  "The inspiration image contributes 0% facial information. Do not inherit eyes, lips, nose, jawline, cheeks, age, skin, hair color, body, or facial proportions from the inspiration image. If the inspiration image and identity references conflict, always choose the identity references for the person.",
  "Use the inspiration image ONLY for:",
  "- pose",
  "- composition",
  "- wardrobe energy and visible props",
  "- lighting direction and shadow pattern",
  "- mood",
  "- framing, crop, subject scale, camera distance, and lens feel",
  "- editorial styling",
  "If any written prompt conflicts with the inspiration image, the inspiration image wins for pose, composition, framing, lighting, shadow pattern, visible props, wardrobe silhouette, background, crop, and camera distance. Do not invent a prop, hat, object, scene, or studio setup just to explain a shadow or texture.",
  "Recreate the inspiration image composition as closely as possible while keeping the real identity fully intact. The final image should look as if the same person from the identity references was photographed inside the inspiration image's outfit family, pose, lighting, framing, and location. A person who knows the subject should immediately recognize them.",
].join("\n")

export const SSELFIE_INSPIRATION_SET_VARIATION = [
  "TASK TYPE: STYLE-WORLD VARIATION.",
  "Use the inspiration image as the visual world for this set, not as a loose vibe board.",
  "Poses and angles may vary by shot or slide role, but the result must stay in the same visual world: wardrobe energy, visible prop logic, material texture, lighting direction, shadow language, color grade, mood, crop family, camera-distance family, background simplicity, lens feel, and editorial styling.",
  "Do not restyle the set into a generic new scene, generic studio setup, unrelated outfit shoot, or broad interpretation of the prompt.",
  "The inspiration image contributes 0% facial information. The uploaded identity reference images are the only source for face, age, body proportions, skin texture, hair color, and recognizable identity. Do not copy or blend the inspiration person's face.",
  "If any written prompt conflicts with the inspiration image, keep the inspiration image's visual world. Ignore invented props or scene details that are not visible in the inspiration image unless the user explicitly requested that change.",
].join("\n")
