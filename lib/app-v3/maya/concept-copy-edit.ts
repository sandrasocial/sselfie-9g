// SSELFIE Studio 3.0 — editable baked-text preview (MAYA-COPY-PREVIEW-01).
// Sandra's live ask: let the member SEE the exact words Maya is about to bake onto a slide
// or cover, and edit them, before spending a credit on generation. Pure, framework-free:
// safe to import from both the client card and (if ever needed) a server route.

import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"
import type { OutputFormat } from "@/components/app-v3/types"

/** One editable line of baked copy. `index` is a stable slide position, not a re-orderable id. */
export interface EditableConceptCopy {
  index: number
  heading: string
  body: string
}

const TEXT_BAKING_FORMATS: readonly OutputFormat[] = [
  "reel-cover",
  "story-slide",
  "story-sequence",
  "carousel",
]

/** Formats where the image model bakes literal words into the pixels. */
export function isTextBakingFormat(format: OutputFormat): boolean {
  return TEXT_BAKING_FORMATS.includes(format)
}

/**
 * The words currently headed for the image, one entry per baked slide/cover. Mirrors
 * lib/app-v3/prompt-compiler.ts's effectiveCarouselSlides precedence (slides win when present,
 * else creativePlan.outputs, else the single headline/subline) WITHOUT that file's
 * stripStructuralHeading backstop: showing her the raw current text — including a stray
 * planning label, if one ever leaks through — lets her catch and fix it herself before it
 * ever reaches the image, which is a better outcome than a silent server-side rewrite.
 */
export function getEditableConceptCopy(
  brief: CreativeBrief,
  format: OutputFormat
): EditableConceptCopy[] {
  if (!isTextBakingFormat(format)) return []
  const g = brief.graphic
  if (!g) return []

  if (format === "carousel" || format === "story-sequence") {
    const slides = g.slides ?? []
    const outputs = g.creativePlan?.outputs ?? []
    const count = Math.max(slides.length, outputs.length)
    if (count === 0) {
      const heading = (g.headline ?? "").trim()
      if (!heading) return []
      return [{ index: 0, heading, body: (g.subline ?? "").trim() }]
    }
    return Array.from({ length: count }, (_, index) => ({
      index,
      heading: (slides[index]?.heading ?? outputs[index]?.title ?? "").trim(),
      body: (slides[index]?.body ?? outputs[index]?.body ?? "").trim(),
    }))
  }

  // reel-cover / story-slide: a single cover.
  const heading = (g.headline ?? g.creativePlan?.outputs?.[0]?.title ?? "").trim()
  if (!heading) return []
  const body = (g.subline ?? g.creativePlan?.outputs?.[0]?.body ?? "").trim()
  return [{ index: 0, heading, body }]
}

/**
 * Returns a NEW brief with her edited words merged back in at whichever representation Maya
 * used (slides array, creativePlan.outputs, or the single headline/subline) — every other
 * field (imagePromptDirection, purpose, referenceImageStrategy, textSafeArea, visual world)
 * stays exactly as Maya wrote it. Only the baked text is ever hers to change here.
 */
export function applyEditedConceptCopy(
  brief: CreativeBrief,
  edits: EditableConceptCopy[]
): CreativeBrief {
  const g = brief.graphic
  if (edits.length === 0 || !g) return brief

  const hasMultiSlidePlan = Boolean(g.slides?.length || g.creativePlan?.outputs?.length)
  if (hasMultiSlidePlan) {
    const byIndex = new Map(edits.map(edit => [edit.index, edit]))
    const nextSlides = g.slides?.map((slide, index) => {
      const edit = byIndex.get(index)
      return edit ? { ...slide, heading: edit.heading, body: edit.body } : slide
    })
    const nextOutputs = g.creativePlan?.outputs?.map((output, index) => {
      const edit = byIndex.get(index)
      return edit ? { ...output, title: edit.heading, body: edit.body } : output
    })

    return {
      ...brief,
      graphic: {
        ...g,
        ...(nextSlides ? { slides: nextSlides } : {}),
        ...(g.creativePlan && nextOutputs
          ? { creativePlan: { ...g.creativePlan, outputs: nextOutputs } }
          : {}),
      },
    }
  }

  // Single-cover fallback (a reel-cover/story-slide concept with no plan yet).
  const edit = edits[0]
  return {
    ...brief,
    graphic: { ...g, headline: edit.heading, subline: edit.body || undefined },
  }
}
