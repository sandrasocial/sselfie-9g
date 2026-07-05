// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

import {
  computeOverlayLayout,
  getOverlayMarkableWords,
  getOverlayStyleGuide,
  makeTextOverlaySpec,
  OVERLAY_SIZE_MULTIPLIERS,
  OVERLAY_STYLE_PRESETS,
  OVERLAY_TOKENS,
  pickOverlayStyle,
  resolveOverlayStyle,
  safeZoneFor,
  sanitizeTextOverlaySpec,
  toggleMarkedWord,
  wrapOverlayText,
  type OverlayStyleId,
  type TextOverlaySpec,
} from "@/lib/app-v3/text-overlay"
import { CAROUSEL_DESIGN_SYSTEMS } from "@/lib/app-v3/maya/carousel-design-systems"
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

const measure = (text: string) => text.length * 24

const FIVE_STYLES: OverlayStyleId[] = [
  "editorial-serif-center",
  "lower-third-accent",
  "top-band-minimal",
  "quote-statement",
  "series-cover",
]

function specFor(style: OverlayStyleId, overrides?: Partial<TextOverlaySpec>): TextOverlaySpec {
  return {
    headline: "Look expensive without trying",
    subline: "Three quiet styling moves",
    position: "bottom",
    style,
    format: "reel-cover",
    ...overrides,
  }
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
    const layout = computeOverlayLayout(spec, 1080, 1920, measure)
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

  it("attaches a per-slide overlay spec on flag-on carousels, mapped from the design system", async () => {
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
    // soft-minimal (design system) maps to the top-band-minimal overlay style, which owns
    // its position: quiet line across the top on every slide.
    expect(jobs[0]?.textOverlaySpec?.style).toBe("top-band-minimal")
    expect(jobs[0]?.textOverlaySpec?.position).toBe("top")
    expect(jobs[2]?.textOverlaySpec?.position).toBe("top")
    expect(prompts).toMatch(/Do not render any text/i)
    expect(prompts).not.toMatch(/Render this exact headline inside the image/)
    delete process.env.APP_V3_TEXT_OVERLAY_LAYER
  })

  it("ports Sandra's five named styles as presets with distinct geometry", () => {
    const presets = FIVE_STYLES.map(id => resolveOverlayStyle(id))
    for (let i = 0; i < presets.length; i++) {
      expect(presets[i].id).toBe(FIVE_STYLES[i])
    }
    // Each style owns a distinct type scale - never one flat look.
    const fracs = new Set(presets.map(p => p.headlineFrac))
    expect(fracs.size).toBe(FIVE_STYLES.length)
    // The lower third is the only left-aligned member style.
    expect(presets.find(p => p.id === "lower-third-accent")?.align).toBe("left")
    expect(presets.filter(p => p.align === "center")).toHaveLength(4)
    // Serif headlines over photos are never lighter than 500.
    for (const preset of presets) {
      expect(preset.headlineWeight).toBeGreaterThanOrEqual(500)
    }
    // Distinct scrim treatments: floor fade, local band, and deliberate none all exist.
    const scrims = new Set(presets.map(p => p.scrim))
    expect(scrims.has("floor")).toBe(true)
    expect(scrims.has("band")).toBe(true)
    expect(scrims.has("none")).toBe(true)
  })

  it("renders the default cover at magazine-cover confidence (1080x1920)", () => {
    const layout = computeOverlayLayout(specFor("editorial-serif-center"), 1080, 1920, measure)
    const headline = layout.lines.find(line => line.kind === "headline")
    expect(headline).toBeDefined()
    expect(headline!.fontPx).toBeGreaterThanOrEqual(100)
    expect(headline!.fontPx).toBeLessThanOrEqual(115)
    expect(headline!.fontWeight).toBeGreaterThanOrEqual(500)
    // The hairline rule between headline and uppercase label is part of the design.
    expect(layout.rule).not.toBeNull()
  })

  it("applies the member S/M/L size multiplier to the layout", () => {
    const sizes = (["s", "m", "l"] as const).map(size => {
      const layout = computeOverlayLayout(
        specFor("editorial-serif-center", { size }),
        1080,
        1920,
        measure
      )
      return layout.lines[0].fontPx
    })
    expect(sizes[0]).toBeLessThan(sizes[1])
    expect(sizes[1]).toBeLessThan(sizes[2])
    expect(sizes[2] / sizes[1]).toBeCloseTo(OVERLAY_SIZE_MULTIPLIERS.l, 1)
  })

  it("renders the *word* emphasis marker as italic plus a hand-drawn underline", () => {
    const layout = computeOverlayLayout(
      specFor("lower-third-accent", { headline: "I stopped hiding and got *visible*" }),
      1080,
      1920,
      measure
    )
    const segments = layout.lines.filter(l => l.kind === "headline").flatMap(l => l.segments)
    const emphasized = segments.filter(s => s.emphasized)
    expect(emphasized.length).toBe(1)
    expect(emphasized[0].text).toBe("visible")
    expect(emphasized[0].italic).toBe(true)
    // No marker characters ever reach the rendered text.
    for (const segment of segments) expect(segment.text).not.toContain("*")
    const underlines = layout.accents.filter(a => a.kind === "underline")
    expect(underlines).toHaveLength(1)
    expect(underlines[0].color).toBe(OVERLAY_TOKENS.porcelain)
    expect(underlines[0].d).toMatch(/^M /)
  })

  it("shows marked words plain in styles without an accent treatment", () => {
    const layout = computeOverlayLayout(
      specFor("editorial-serif-center", { headline: "I stopped hiding and got *visible*" }),
      1080,
      1920,
      measure
    )
    const text = layout.lines
      .filter(l => l.kind === "headline")
      .map(l => l.text)
      .join(" ")
    expect(text).toBe("I stopped hiding and got visible")
    expect(layout.accents).toHaveLength(0)
    expect(layout.lines.flatMap(l => l.segments).every(s => !s.strip)).toBe(true)
  })

  it("builds Sandra's cutout reference: one strip line, circled subline words, arrow", () => {
    const layout = computeOverlayLayout(
      {
        headline: "5 Selfie Mistakes *Making Your Photos* Look Cheap",
        subline: "Save this before your *next shoot*",
        position: "top",
        style: "cutout-editorial",
        format: "carousel",
      },
      1080,
      1080,
      measure
    )
    const headlineSegments = layout.lines.filter(l => l.kind === "headline").flatMap(l => l.segments)
    const stripped = headlineSegments.filter(s => s.strip)
    const plain = headlineSegments.filter(s => !s.strip)
    // ONLY the marked phrase sits on a cut-paper strip; the rest is plain cream serif.
    expect(stripped.length).toBeGreaterThanOrEqual(1)
    expect(plain.length).toBeGreaterThanOrEqual(1)
    for (const segment of stripped) {
      expect(segment.color).toBe(OVERLAY_TOKENS.obsidian)
      expect(segment.strip!.color).toBe(OVERLAY_TOKENS.pearl)
      expect(segment.strip!.width).toBeGreaterThan(segment.width)
    }
    for (const segment of plain) expect(segment.color).toBe(OVERLAY_TOKENS.porcelain)
    // The marked subline words get the loose hand-drawn ellipse; the arrow points at her.
    const circles = layout.accents.filter(a => a.kind === "circle")
    const arrows = layout.accents.filter(a => a.kind === "arrow")
    expect(circles).toHaveLength(1)
    expect(arrows).toHaveLength(1)
    for (const accent of [...circles, ...arrows]) {
      expect(accent.color).toBe(OVERLAY_TOKENS.porcelain)
      expect(accent.thickness).toBeGreaterThanOrEqual(2)
      expect(accent.thickness).toBeLessThanOrEqual(3)
    }
    // No scrim: the collage image owns the mood; the strip carries the contrast.
    expect(layout.scrim).toBeNull()
  })

  it("keeps left-aligned styles inside the safe zone on both edges", () => {
    for (const style of ["lower-third-accent", "cutout-editorial"] as const) {
      const spec = specFor(style, {
        headline: "I rebuilt my whole brand with one *honest* selfie",
        format: "reel-cover",
      })
      const layout = computeOverlayLayout(spec, 1080, 1920, measure)
      const safe = safeZoneFor("reel-cover")
      expect(layout.align).toBe("left")
      for (const line of layout.lines) {
        expect(line.x).toBeGreaterThanOrEqual(1080 * safe.side - 0.5)
        expect(line.x + line.width).toBeLessThanOrEqual(1080 * (1 - safe.side) + 0.5)
      }
    }
  })

  it("locks the series cover position so the grid stays recognizable", () => {
    const spec = makeTextOverlaySpec({
      heading: "Prompt My Selfie",
      body: "Part 3",
      role: "hook",
      format: "reel-cover",
    })
    // A "Part 3" label reads as a series and locks to center even for a hook slide.
    expect(spec.style).toBe("series-cover")
    expect(spec.position).toBe("center")
    const sanitized = sanitizeTextOverlaySpec({ ...spec, position: "top" })
    expect(sanitized?.position).toBe("center")
  })

  it("picks the starting style from Maya's pick, the design system, or the emotion", () => {
    // Maya's explicit pick wins.
    expect(
      pickOverlayStyle({ format: "reel-cover", overlayStyle: "quote-statement", emotion: "calm" })
    ).toBe("quote-statement")
    // Carousel design systems map to their matching overlay world.
    expect(pickOverlayStyle({ format: "carousel", designSystem: "cutout-editorial" })).toBe(
      "cutout-editorial"
    )
    expect(pickOverlayStyle({ format: "carousel", designSystem: "full-bleed-editorial" })).toBe(
      "quote-statement"
    )
    // Emotion nudges single covers; the default stays the editorial cover.
    expect(pickOverlayStyle({ format: "reel-cover", emotion: "raw, vulnerable, honest" })).toBe(
      "lower-third-accent"
    )
    expect(pickOverlayStyle({ format: "reel-cover", emotion: "dramatic, moody" })).toBe(
      "quote-statement"
    )
    expect(pickOverlayStyle({ format: "reel-cover", emotion: "calm, assured" })).toBe(
      "editorial-serif-center"
    )
  })

  it("uses only approved design-system tokens in every layer preset", () => {
    const approved = new Set<string>(Object.values(OVERLAY_TOKENS))
    for (const preset of OVERLAY_STYLE_PRESETS) {
      expect(approved.has(preset.headlineColor)).toBe(true)
      expect(approved.has(preset.sublineColor)).toBe(true)
      expect(approved.has(preset.scrimColor)).toBe(true)
      if (preset.stripColor) expect(approved.has(preset.stripColor)).toBe(true)
      if (preset.stripTextColor) expect(approved.has(preset.stripTextColor)).toBe(true)
      // Retired gold accent must never come back.
      expect(preset.headlineColor.toLowerCase()).not.toBe("#c9a96e")
    }
  })

  it("guarantees contrast unless the style deliberately relies on calm negative space", () => {
    // Styles without a scrim carry explicit placement guidance for Maya instead.
    const deliberateNone = new Set(["top-band-minimal", "cutout-editorial"])
    for (const preset of OVERLAY_STYLE_PRESETS) {
      if (preset.scrim === "none") {
        expect(deliberateNone.has(preset.id)).toBe(true)
        continue
      }
      const layout = computeOverlayLayout(specFor(preset.id, { format: "story-slide" }), 1080, 1920, measure)
      expect(layout.scrim).not.toBeNull()
      expect(layout.scrim!.alpha).toBeGreaterThan(0)
    }
  })

  it("wraps a long headline instead of overflowing the safe width", () => {
    const wideMeasure = (text: string) => text.length * 40
    const lines = wrapOverlayText(
      "Look like yourself on your very best day",
      500,
      "400 80px serif",
      wideMeasure
    )
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      expect(wideMeasure(line)).toBeLessThanOrEqual(500)
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
      size: "xl",
      format: "reel-cover",
    })
    expect(clean).not.toBeNull()
    expect(clean?.headline).toBe("Look expensive without trying")
    expect(clean?.position).toBe("bottom")
    expect(clean?.style).toBe("editorial-serif-center")
    expect(clean?.format).toBe("reel-cover")
    expect(clean?.size).toBeUndefined()

    const sized = sanitizeTextOverlaySpec({
      headline: "Hi there",
      position: "top",
      style: "lower-third-accent",
      size: "l",
      format: "story-slide",
    })
    expect(sized?.size).toBe("l")
  })

  it("migrates old stored style ids to the new named styles", () => {
    const cases: [string, OverlayStyleId][] = [
      ["editorial-cover", "editorial-serif-center"],
      ["soft-minimal", "top-band-minimal"],
      ["full-bleed-editorial", "quote-statement"],
      ["cutout-editorial", "cutout-editorial"],
    ]
    for (const [legacy, expected] of cases) {
      expect(resolveOverlayStyle(legacy).id).toBe(expected)
      const spec = sanitizeTextOverlaySpec({
        headline: "Still you, at your best",
        position: "bottom",
        style: legacy,
        format: "reel-cover",
      })
      expect(spec?.style).toBe(expected)
    }
  })

  it("keeps the overlay-mode cutout image free of baked ink marks (the layer owns them)", () => {
    const cutout = CAROUSEL_DESIGN_SYSTEMS.find(s => s.id === "cutout-editorial")
    expect(cutout).toBeDefined()
    expect(cutout!.textFreeSetDna).toMatch(/NO hand-drawn marks/i)
    expect(cutout!.textFreeSetDna).not.toMatch(/a small arrow, a loose circle/)
    // The baked-text path keeps its accents (flag off, nothing changes).
    expect(cutout!.setDna).toMatch(/Hand-drawn accents/)
  })

  it("teaches Maya the style library and wires it into the persona", () => {
    const guide = getOverlayStyleGuide()
    for (const id of FIVE_STYLES) expect(guide).toContain(id)
    expect(guide).toContain("cutout-editorial")
    expect(guide).toContain("brief.graphic.overlayStyle")
    const persona = readFileSync("lib/app-v3/maya/persona.ts", "utf8")
    expect(persona).toContain("getOverlayStyleGuide")
    expect(persona).toContain("isTextOverlayLayerEnabled")
  })

  it("gives the member style, size, and position controls in the editor", () => {
    const editor = readFileSync("components/app-v3/text-overlay-layer.tsx", "utf8")
    expect(editor).toContain("OVERLAY_STYLE_PRESETS.map")
    expect(editor).toContain("Text size")
    expect(editor).toMatch(/onChange\(\{ \.\.\.spec, size: size\.id \}\)/)
    // The live layer and the export both come from computeOverlayLayout (always match).
    expect(editor.split("computeOverlayLayout").length).toBeGreaterThan(2)
  })

  it("keeps the generate route wired for clean-background graphics + overlay specs", () => {
    const route = readFileSync("app/api/app-v3/maya/generate/route.ts", "utf8")
    expect(route).toContain("isTextOverlayLayerEnabled")
    expect(route).toContain("function usesCompositedTextOverlay")
    expect(route).toContain("isRedesignGraphicFormat(format)")
    expect(route).toContain("Boolean(requestedOverlayStyle)")
    expect(route).toContain('textMode: textOverlayEnabled ? "clean-background" : "baked"')
    expect(route).toContain("textOverlaySpecs")
  })
})

describe("overlay visual picker (Sandra's 2026-07-02 feedback)", () => {
  it("exposes headline words as tappable chips with markers stripped", () => {
    expect(getOverlayMarkableWords("Look *expensive* without trying")).toEqual([
      { text: "Look", marked: false },
      { text: "expensive", marked: true },
      { text: "without", marked: false },
      { text: "trying", marked: false },
    ])
    expect(getOverlayMarkableWords("")).toEqual([])
  })

  it("toggleMarkedWord marks and unmarks a word in *asterisk* format", () => {
    expect(toggleMarkedWord("look expensive without trying", 1)).toBe(
      "look *expensive* without trying"
    )
    expect(toggleMarkedWord("look *expensive* without trying", 1)).toBe(
      "look expensive without trying"
    )
  })

  it("toggleMarkedWord merges adjacent taps into one contiguous phrase", () => {
    expect(toggleMarkedWord("look *expensive* without trying", 2)).toBe(
      "look *expensive without* trying"
    )
    expect(toggleMarkedWord("look *expensive* without trying", 0)).toBe(
      "*look expensive* without trying"
    )
  })

  it("toggleMarkedWord enforces a single contiguous phrase", () => {
    // Tapping a word away from the phrase MOVES the mark there (never two phrases).
    expect(toggleMarkedWord("*look* expensive without trying", 3)).toBe(
      "look expensive without *trying*"
    )
    // Untapping an inner word keeps one side, never a split mark.
    const split = toggleMarkedWord("*look expensive without* trying", 1)
    expect(split).toBe("*look* expensive without trying")
    expect((split.match(/\*/g) ?? []).length).toBe(2)
    // Out-of-range taps are a no-op.
    expect(toggleMarkedWord("look expensive", 9)).toBe("look expensive")
    expect(toggleMarkedWord("look expensive", -1)).toBe("look expensive")
  })

  it("renders the style picker as live mini previews on the member's own image", () => {
    const editor = readFileSync("components/app-v3/text-overlay-layer.tsx", "utf8")
    // The editor receives the generated image and previews every preset on it.
    expect(editor).toContain("imageUrl: string")
    expect(editor).toContain("OVERLAY_STYLE_PRESETS.map")
    expect(editor).toContain("<TextOverlayLayer spec={previewSpec} />")
    expect(editor).toContain("src={imageUrl}")
    // No invisible title-attribute hints; no asterisk-typing instructions.
    expect(editor).not.toContain("title={style.hint}")
    expect(editor).not.toContain("Star one phrase")
    // Tap-to-highlight chips are wired for marked-phrase styles.
    expect(editor).toContain("toggleMarkedWord")
    expect(editor).toContain("getOverlayMarkableWords")
  })

  it("shows all six styles at once in a grid, never a horizontal hunt", () => {
    // Sandra's 2026-07-02 feedback: Cutout Editorial scrolled off the horizontal row.
    const editor = readFileSync("components/app-v3/text-overlay-layer.tsx", "utf8")
    expect(editor).toContain("grid grid-cols-3")
    expect(editor).not.toContain("overflow-x-auto")
    expect(OVERLAY_STYLE_PRESETS).toHaveLength(6)
  })
})

describe("text studio entry points (TEXT-STUDIO-01, Sandra's 2026-07-02 feedback)", () => {
  it("opens the studio from the concept card instead of rendering the editor inline", () => {
    const card = readFileSync("components/app-v3/concept-card.tsx", "utf8")
    expect(card).not.toContain("TextOverlayEditor")
    expect(card).toContain("onOpenTextStudio")
    expect(card).toContain("Edit text")
    // A baked render wins the card view and the download; the clean base stays kept.
    expect(card).toContain("firstBaked ?? images[0]")
    expect(card).toContain("{firstOverlay && !firstBaked && <TextOverlayLayer spec={firstOverlay} />}")
    expect(card).toContain('if (firstBaked) window.open(firstBaked, "_blank", "noreferrer")')
  })

  it("opens the studio from the lightbox instead of rendering the editor inline", () => {
    const lightbox = readFileSync("components/app-v3/image-lightbox.tsx", "utf8")
    expect(lightbox).not.toContain("TextOverlayEditor")
    expect(lightbox).toContain("onOpenTextStudio")
    expect(lightbox).toContain("Edit text")
    expect(lightbox).toContain("baked ?? url")
    expect(lightbox).toContain("{overlay && !baked && <TextOverlayLayer spec={overlay} />}")
  })

  it("wires the studio in the concierge: spec edits retire stale bakes, bakes persist per index", () => {
    const concierge = readFileSync("components/app-v3/maya-concierge.tsx", "utf8")
    expect(concierge).toContain("<TextStudio")
    expect(concierge).toContain("setTextStudio({ key, index: 0 })")
    expect(concierge).toContain("updateBakedImage")
    // Editing the design retires the baked render (its pixels carry the OLD words).
    expect(concierge).toMatch(/nextBaked\[index\] = null/)
  })

  it("persists baked renders in both draft snapshot sanitizers alongside the specs", () => {
    for (const file of ["lib/app-v3/maya/draft-snapshot.ts", "components/app-v3/continuity.ts"]) {
      const source = readFileSync(file, "utf8")
      expect(source).toContain("bakedImageUrls")
      expect(source).toContain('url.startsWith("https://")')
    }
  })

  it("pins the preview at the top of the studio and scrolls the controls beneath it", () => {
    const studio = readFileSync("components/app-v3/text-studio.tsx", "utf8")
    // Pinned preview region (fixed height, shrink-0) + scrollable controls (flex-1).
    expect(studio).toMatch(/h-\[46vh\][^"]*shrink-0/)
    expect(studio).toMatch(/flex-1 overflow-y-auto/)
    // The studio reuses the full editor (6-card grid, chips, size, position) below the preview.
    expect(studio).toContain("<TextOverlayEditor spec={spec} imageUrl={cleanImageUrl} onChange={changeSpec} />")
    expect(studio).toContain("Apply to photo")
  })
})
