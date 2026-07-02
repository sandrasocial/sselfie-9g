// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

import {
  computeOverlayLayout,
  makeTextOverlaySpec,
  OVERLAY_STYLE_PRESETS,
  OVERLAY_TOKENS,
  safeZoneFor,
  sanitizeTextOverlaySpec,
  wrapOverlayText,
} from "@/lib/app-v3/text-overlay"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

const brief: CreativeBrief = {
  outfit: "The Row cream cashmere turtleneck",
  setting: "a marble cafe table by a tall window in Paris morning light",
  mood: "calm, assured",
  pose: "seated, mid-thought, looking out the window",
  cameraSpec: "Hasselblad X2D 100C, 55mm f/2.5",
  lighting: "soft north-facing window light",
  graphic: {
    headline: "Look expensive without trying",
    subline: "Three quiet styling moves",
    designSystem: "cutout-editorial",
  },
}

describe("MAYA-FIX-03 composited overlay layer", () => {
  it("can request a clean text-free background for the app-composited layer", async () => {
    vi.resetModules()
    process.env.APP_V3_TEXT_OVERLAY_LAYER = "true"
    const { compileConceptJobs } = await import("@/lib/app-v3/prompt-compiler")
    const jobs = compileConceptJobs(brief, "reel-cover")
    const prompt = jobs.flatMap(job => job.passes.map(pass => pass.prompt)).join("\n")

    expect(prompt).toMatch(/Do not render any text/i)
    expect(prompt).toMatch(/app-composited typography layer/i)
    expect(prompt).not.toMatch(/Render this exact editorial headline inside the image/)
    expect(jobs[0]?.textOverlaySpec?.headline).toBe("Look expensive without trying")
    delete process.env.APP_V3_TEXT_OVERLAY_LAYER
  })

  it("keeps the legacy baked-text prompt available when the flag is off", async () => {
    vi.resetModules()
    delete process.env.APP_V3_TEXT_OVERLAY_LAYER
    const { compileConceptJobs } = await import("@/lib/app-v3/prompt-compiler")
    const jobs = compileConceptJobs(brief, "reel-cover")
    const prompt = jobs.flatMap(job => job.passes.map(pass => pass.prompt)).join("\n")

    expect(prompt).toMatch(/Render this exact editorial headline inside the image/)
    expect(prompt).toMatch(/Look expensive without trying/)
    expect(jobs[0]?.textOverlaySpec).toBeUndefined()
  })

  it("computes overlay text inside the Instagram story safe zone", () => {
    const spec = makeTextOverlaySpec({
      heading: "Look expensive without trying",
      body: "Three quiet styling moves",
      role: "value",
      format: "reel-cover",
    })
    const layout = computeOverlayLayout(spec, 1080, 1920, text => text.length * 24)
    const safe = safeZoneFor("reel-cover")
    const minY = 1920 * safe.top
    const maxY = 1920 * (1 - safe.bottom)

    expect(layout.lines.length).toBeGreaterThan(0)
    for (const line of layout.lines) {
      expect(line.y).toBeGreaterThanOrEqual(minY)
      expect(line.y + line.fontPx * 1.5).toBeLessThanOrEqual(maxY + 2)
    }
  })

  it("only enables the new layer through the rollout flag", async () => {
    vi.resetModules()
    delete process.env.APP_V3_TEXT_OVERLAY_LAYER
    let mod = await import("@/lib/app-v3/text-overlay")
    expect(mod.isTextOverlayLayerEnabled()).toBe(false)

    vi.resetModules()
    process.env.APP_V3_TEXT_OVERLAY_LAYER = "true"
    mod = await import("@/lib/app-v3/text-overlay")
    expect(mod.isTextOverlayLayerEnabled()).toBe(true)
    delete process.env.APP_V3_TEXT_OVERLAY_LAYER
  })

  it("attaches a per-slide overlay spec on flag-on carousels, in the slide's design system", async () => {
    vi.resetModules()
    process.env.APP_V3_TEXT_OVERLAY_LAYER = "true"
    const { compileConceptJobs } = await import("@/lib/app-v3/prompt-compiler")
    const carouselBrief: CreativeBrief = {
      ...brief,
      graphic: {
        ...brief.graphic,
        designSystem: "soft-minimal",
        slides: [
          { heading: "Start with one clean base", body: "Let the shape do the work" },
          { heading: "Repeat the same quiet tones" },
          { heading: "Save this for your next shoot", role: "cta" },
        ],
      },
    }
    const jobs = compileConceptJobs(carouselBrief, "carousel")
    const prompts = jobs.flatMap(job => job.passes.map(pass => pass.prompt)).join("\n")

    expect(jobs).toHaveLength(3)
    expect(jobs.every(job => job.textOverlaySpec?.headline)).toBe(true)
    expect(jobs[0]?.textOverlaySpec?.style).toBe("soft-minimal")
    expect(jobs[0]?.textOverlaySpec?.position).toBe("top")
    expect(jobs[2]?.textOverlaySpec?.position).toBe("center")
    expect(prompts).toMatch(/Do not render any text/i)
    expect(prompts).not.toMatch(/Render this exact headline inside the image/)
    delete process.env.APP_V3_TEXT_OVERLAY_LAYER
  })

  it("uses only approved design-system tokens in every layer preset", () => {
    const approved = new Set<string>(Object.values(OVERLAY_TOKENS))
    for (const preset of OVERLAY_STYLE_PRESETS) {
      expect(approved.has(preset.headlineColor)).toBe(true)
      expect(approved.has(preset.sublineColor)).toBe(true)
      expect(approved.has(preset.backdropColor)).toBe(true)
      // Retired gold accent must never come back.
      expect(preset.headlineColor.toLowerCase()).not.toBe("#c9a96e")
    }
  })

  it("guarantees a contrast backdrop for every preset", () => {
    const measure = (text: string) => text.length * 30
    for (const preset of OVERLAY_STYLE_PRESETS) {
      const spec = makeTextOverlaySpec({
        heading: "Still you, at your best",
        body: "Save this one",
        role: "value",
        format: "story-slide",
      })
      const layout = computeOverlayLayout({ ...spec, style: preset.id }, 1080, 1920, measure)
      const hasScrim = layout.scrim !== null
      const hasStrips = layout.lines.every(line => !!line.strip)
      // Fade/panel presets draw a scrim; the cutout preset carries a solid strip per line.
      expect(hasScrim || hasStrips).toBe(true)
    }
  })

  it("wraps a long headline instead of overflowing the safe width", () => {
    const measure = (text: string) => text.length * 40
    const lines = wrapOverlayText(
      "Look like yourself on your very best day",
      500,
      "400 80px serif",
      measure
    )
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      expect(measure(line)).toBeLessThanOrEqual(500)
    }
    expect(lines.join(" ")).toBe("Look like yourself on your very best day")
  })

  it("sanitizes untrusted overlay specs from drafts and API payloads", () => {
    expect(sanitizeTextOverlaySpec(null)).toBeNull()
    expect(sanitizeTextOverlaySpec({ headline: "   " })).toBeNull()
    expect(sanitizeTextOverlaySpec({ headline: "Hi", format: "photo" })).toBeNull()

    const clean = sanitizeTextOverlaySpec({
      headline: "  Look  expensive without trying  ",
      subline: "Three quiet moves",
      position: "sideways",
      style: "not-a-style",
      format: "reel-cover",
    })
    expect(clean).not.toBeNull()
    expect(clean?.headline).toBe("Look expensive without trying")
    expect(clean?.position).toBe("bottom")
    expect(clean?.style).toBe("editorial-cover")
    expect(clean?.format).toBe("reel-cover")
  })

  it("keeps the generate route wired for clean-background graphics + overlay specs", () => {
    const route = readFileSync("app/api/app-v3/maya/generate/route.ts", "utf8")
    expect(route).toContain("isTextOverlayLayerEnabled")
    expect(route).toContain('textMode: textOverlayEnabled ? "clean-background" : "baked"')
    expect(route).toContain("textOverlaySpecs")
  })
})
