// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"
import { buildGraphicRedesignSlides, compileConceptJobs } from "@/lib/app-v3/prompt-compiler"
import { buildContentSlideRedesignPrompt } from "@/lib/content-kit/slide-redesign-generator"
import {
  SSELFIE_GRAPHIC_STYLE_PROMPT,
  SSELFIE_INSPIRATION_CLOSE_RECREATE,
  SSELFIE_INSPIRATION_SET_VARIATION,
} from "@/lib/app-v3/maya/visual-rules"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

vi.mock("server-only", () => ({}))

const retiredAccentTerms = [/oxblood/i, /burgundy/i, /#6E2A35/i]

function expectNoRetiredAccentTerms(text: string) {
  for (const term of retiredAccentTerms) {
    expect(text).not.toMatch(term)
  }
}

describe("Maya June 11 restoration guardrails", () => {
  it("keeps shared graphic prompts out of the retired red accent language", () => {
    expectNoRetiredAccentTerms(SSELFIE_GRAPHIC_STYLE_PROMPT)

    const prompt = buildContentSlideRedesignPrompt({
      category: "photoshoot-carousel",
      topic: "How to prep your brand photoshoot",
      styleLabel: "approved SSELFIE reference",
      referenceMode: "identity-scene",
      slide: {
        kind: "hook",
        title: "Prep Like This",
        body: "The small choices that make it feel like you.",
        visualConcept: "same woman at a clean studio desk with wardrobe notes",
        imagePromptDirection: "editorial planning moment, neutral palette, calm negative space",
      },
    })

    // Carousel/tutorial redesigns now match the style anchor directly (restored from 5345bcab).
    expect(prompt).toContain("Match the SECOND reference image's style as closely as possible")
    expect(prompt).toContain("elegant high-contrast serif headlines")
    expect(prompt).toContain("cool monochrome palette")
    expectNoRetiredAccentTerms(prompt)
  })

  it("applies the shared graphic rules to user-facing reel covers", () => {
    const brief: CreativeBrief = {
      outfit: "Toteme ivory knit and tailored black trousers",
      setting: "quiet Copenhagen apartment with morning window light",
      mood: "calm, direct, editorial",
      pose: "seated at a table, looking slightly off-camera",
      cameraSpec: "Canon EOS R5, 50mm f/1.8",
      lighting: "soft north-facing window light",
      graphic: {
        headline: "Stop Waiting",
        subline: "Your brand can look like you now.",
      },
    }

    const prompt = compileConceptJobs(brief, "reel-cover")[0]?.passes[0]?.prompt ?? ""
    expect(prompt).toContain("Premium SSELFIE editorial slide")
    expect(prompt).toContain("No red accent palette")
    expectNoRetiredAccentTerms(prompt)
  })

  it("keeps internal section roles out of rendered text-overlay prompts", () => {
    const brief: CreativeBrief = {
      outfit: "oversized espresso knit cardigan",
      setting: "quiet marble kitchen table with laptop and morning window light",
      mood: "intimate, grounded, editorial",
      pose: "seated with one knee tucked up, looking toward the window",
      cameraSpec: "Hasselblad X2D 100C, 55mm f/2.5",
      lighting: "soft north-facing window light",
      graphic: {
        headline: "The Morning I Stopped Waiting",
        subline: "A private founder note.",
        role: "hook",
        slides: [
          {
            role: "hook",
            heading: "I Built a Business From This Kitchen Table",
            body: "The honest beginning.",
          },
          {
            role: "value",
            heading: "At 39, I Was Completely Broke",
            body: "Single mom of three in a 2-bedroom apartment.",
          },
          {
            role: "cta",
            heading: "Want the prompts?",
            body: "DM me PROMPT.",
          },
        ],
      },
    }

    const reelPrompt = compileConceptJobs(brief, "reel-cover")[0]?.passes[0]?.prompt ?? ""
    const carouselPrompts = buildGraphicRedesignSlides(brief, "carousel", "Founder story").map(
      slide =>
        buildContentSlideRedesignPrompt({
          category: "photoshoot-carousel",
          topic: "Founder story",
          styleLabel: "approved SSELFIE reference",
          referenceMode: "identity-scene",
          slide,
        })
    )
    const directCarouselPrompts = compileConceptJobs(brief, "carousel").map(
      job => job.passes[0]?.prompt ?? ""
    )

    const combinedPrompt = [reelPrompt, ...carouselPrompts, ...directCarouselPrompts].join("\n\n")
    expect(combinedPrompt).toContain("The Morning I Stopped Waiting")
    expect(combinedPrompt).toContain("I Built a Business From This Kitchen Table")
    expect(combinedPrompt).toContain("At 39, I Was Completely Broke")
    expect(combinedPrompt).not.toContain("Finished slide role:")
    expect(combinedPrompt).not.toContain('Small label: "reel cover"')
    expect(combinedPrompt).not.toContain('Small label: "hook"')
    expect(combinedPrompt).not.toContain('Small label: "value"')
    expect(combinedPrompt).not.toContain('Small label: "cta"')
    expect(combinedPrompt).not.toContain('Step number: "01"')
  })

  it("keeps inspiration handling close to the June 11 prompting plan", () => {
    const route = readFileSync("app/api/app-v3/maya/generate/route.ts", "utf8")
    const persona = readFileSync("lib/app-v3/maya/persona.ts", "utf8")
    expect(route).toContain("SSELFIE_INSPIRATION_CLOSE_RECREATE")
    expect(route).toContain("close-recreation")
    expect(route).toContain("set-variation")
    expect(route).toContain('isHero ? "close-recreation" : "set-variation"')
    expect(route).toContain("inspirationReferenceUrl: inspirationReferenceUrl ?? undefined")
    expect(SSELFIE_INSPIRATION_CLOSE_RECREATE).toContain("TASK TYPE: IMAGE RECONSTRUCTION")
    expect(SSELFIE_INSPIRATION_CLOSE_RECREATE).toContain(
      "The inspiration image is the visual blueprint"
    )
    expect(SSELFIE_INSPIRATION_CLOSE_RECREATE).toContain(
      "If any written prompt conflicts with the inspiration image"
    )
    expect(SSELFIE_INSPIRATION_CLOSE_RECREATE).toContain(
      "The inspiration image contributes 0% facial information"
    )
    expect(SSELFIE_INSPIRATION_CLOSE_RECREATE).not.toContain("Sandra")
    expect(SSELFIE_INSPIRATION_SET_VARIATION).toContain("TASK TYPE: STYLE-WORLD VARIATION")
    expect(SSELFIE_INSPIRATION_SET_VARIATION).toContain("Poses and angles may vary")
    expect(SSELFIE_INSPIRATION_SET_VARIATION).toContain(
      "Do not restyle the set into a generic new scene"
    )
    expect(persona).toContain("treat it as a visual blueprint")
    expect(persona).toContain("Do not invent props, hats, furniture")
  })

  it("requires camera-distance/crop variety by shot role instead of anchoring it to the inspiration image (2026-07-05)", () => {
    // Photoshoots (admin Shoot Studio, suite Maya, admin slide redesign - all share this
    // constant by design) were coming out near-identical shot to shot. Root cause: the locked
    // "stay in the same visual world" list included "crop family, camera-distance family",
    // directly contradicting the very next clause ("poses and angles may vary"). Camera distance
    // is the primary way an establishing wide shot and a close portrait read as different shots.
    expect(SSELFIE_INSPIRATION_SET_VARIATION).not.toContain("crop family, camera-distance family")
    expect(SSELFIE_INSPIRATION_SET_VARIATION).toContain(
      "Camera distance and crop MUST vary to match each shot's role"
    )
    // The lock list still legitimately protects wardrobe/lighting/mood/location cohesion.
    expect(SSELFIE_INSPIRATION_SET_VARIATION).toContain("wardrobe energy")
    expect(SSELFIE_INSPIRATION_SET_VARIATION).toContain("lighting direction")
    expect(SSELFIE_INSPIRATION_SET_VARIATION).toContain("color grade")
  })

  it("lets text-overlay graphics use an attached inspiration as a third style-world reference", () => {
    const prompt = buildContentSlideRedesignPrompt({
      category: "photoshoot-carousel",
      topic: "Shadow and linen portrait",
      styleLabel: "approved SSELFIE reference",
      referenceMode: "identity-scene",
      hasInspirationReference: true,
      slide: {
        kind: "photo",
        title: "Soft Shadow",
        body: "The same mood, a new angle.",
        visualConcept: "same woman in the uploaded inspiration's shadow-and-knit world",
      },
    })

    expect(prompt).toContain("THIRD reference image is the inspiration image")
    expect(prompt).toContain("same visual world")
    expect(prompt).toContain("poses and angles can vary")
    expect(prompt).toContain("If the slide plan conflicts with the inspiration reference")
  })

  it("keeps admin story sequence graphics overlay-only", () => {
    const prompt = buildContentSlideRedesignPrompt({
      category: "story-sequence",
      topic: "The fear behind posting AI photos",
      styleLabel: "approved SSELFIE reference",
      slide: {
        kind: "hook",
        title: "You do not need to become someone else",
        body: "You just need to stop hiding.",
      },
    })

    expect(prompt).toContain("Preserve the original photo exactly")
    expect(prompt).toContain("This is an overlay-only design")
    expect(prompt).toContain("Do not retouch, beautify, smooth skin")
    expect(prompt).toContain("Use the SECOND reference image for typography")
    expect(prompt).toContain("Do not use it to alter the first photo")
    expect(prompt).toContain("Do not cover the face, eyes, phone, hands")
  })

  it("gates admin prompt inspection on the server and reads the stored ai_images prompt", () => {
    const route = readFileSync("app/api/admin/app-v3/generation-prompt/route.ts", "utf8")
    expect(route).toContain("isAdminEmail")
    expect(route).toContain('return NextResponse.json({ error: "Forbidden" }, { status: 403 })')
    expect(route).toContain("FROM ai_images")
    expect(route).toContain("generated_prompt")
    expect(route).toContain('modelProvider: "openai"')
  })

  it("uses a reel-cover style category before falling back to story references", () => {
    const route = readFileSync("app/api/app-v3/maya/generate/route.ts", "utf8")
    const references = readFileSync("lib/content-kit/slide-redesign-generator.ts", "utf8")

    expect(references).toContain('"reel-cover"')
    expect(route).toContain('return "reel-cover"')
    // STORY-GENERATION fix 2026-07-03: story-slide shares the reel-cover grounding + fallback.
    expect(route).toContain(
      'return format === "reel-cover" || format === "story-slide" ? "story-sequence" : undefined'
    )
  })

  it("stores prompt metadata with model and reference urls for admin inspection", () => {
    const route = readFileSync("app/api/app-v3/maya/generate/route.ts", "utf8")

    expect(route).toContain("Model provider: openai")
    expect(route).toContain("Model: ${OPENAI_IMAGE_MODEL}")
    expect(route).toContain("Reference URLs used:")
    expect(route).toContain("Style reference URL used:")
  })
})
