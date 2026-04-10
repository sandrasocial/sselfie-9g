/**
 * FLUX LoRA — concept-card examples (storytelling prose, no section labels)
 *
 * Aligns with lib/maya/flux-prompting-principles.ts — trigger once, then narrative.
 */

export function getFluxPerfectExamples(): string {
  return `
**EXAMPLE A — Morning coffee run (replace user_trigger with the real token):**

user_trigger, Golden side light hits the sidewalk while she crosses toward the camera with a takeaway cup, hair in a sleek low ponytail and natural skin texture with visible pores. She's wearing a cream cashmere turtleneck under a tailored camel coat, straight-leg denim, minimal gold at her ears; the block feels alive with glass storefronts and soft pedestrian blur behind her. Uneven daylight mixes cool sky with warm bounce from windows. Candid moment on iPhone 15 Pro portrait mode, shallow depth of field, amateur cellphone photo — muted colors and fine film grain keep it honest, like a friend caught the stride mid-step.

**EXAMPLE B — Quiet at home:**

user_trigger, Sun pools across a linen sofa and pale oak while she sits on the edge with a ceramic mug, shoulders loose, hair in natural color, pores and real skin catching the window. An oversized cream knit with wide sleeves and matching lounge pants wrinkles where she leans forward. Light falls unevenly — cooler by the glass, warmer across the rug — with soft shadows under her cheekbones. Shot on iPhone 15 Pro with a 50mm-equivalent feel and natural bokeh, amateur photography; visible film grain and a restrained palette hold the weekend stillness without polishing it.

**EXAMPLE C — City evening:**

user_trigger, She pauses on a rain-dark crosswalk, trench draped over a ribbed black dress and boots, crossbody bag catching a sliver of storefront neon. Wind-tousled hair frames natural skin texture; mixed streetlight and shop spill create mottled color on her face. She's mid-stride, glancing off-camera, unposed. Candid photo on iPhone 15 Pro, shallow depth, cellphone energy, not a campaign — film grain, muted contrast, grounded mood.

---

**What to copy from these:**
- **Opening:** trigger token, comma, then **one** continuous story (or two short paragraphs) — **never** lines like \`[SCENE]\` or \`[CAMERA]\`.
- **No repeats:** say the trigger **once**; say gender/ethnicity **once** if you use them; say iPhone/candid language **once**.
- **Voice:** reads like a short scene, not a spec duplicated under fake headings.
`
}
