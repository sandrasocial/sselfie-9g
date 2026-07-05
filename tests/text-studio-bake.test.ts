// @vitest-environment node

// Baked-text pipeline.
// The clean text-free image stays the source of truth. Maya auto-bakes when the member chooses
// text, and chat edits run ONE openai.images.edit pass on the CLEAN base with a style-true
// prompt. These tests pin the bake prompt contract (exact words, style typography, IG safe
// zones, No-Fake identity rule), route wiring (auth, credits, refund), and analytics contract.

import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  BAKE_IDENTITY_RULE,
  BAKE_SAFE_ZONE_FEED,
  BAKE_SAFE_ZONE_VERTICAL,
  BAKE_STYLE_DIRECTIVES,
  bakeMarkedPhrase,
  buildBakePrompt,
} from "@/lib/app-v3/text-bake"
import { OVERLAY_STYLE_PRESETS, type OverlayStyleId, type TextOverlaySpec } from "@/lib/app-v3/text-overlay"
import { ALLOWED_ANALYTICS_EVENTS } from "@/lib/analytics/event-contract"

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

const ALL_STYLES = OVERLAY_STYLE_PRESETS.map(preset => preset.id)

describe("bake prompt contract", () => {
  it("covers every overlay style with a bake directive", () => {
    for (const id of ALL_STYLES) {
      expect(BAKE_STYLE_DIRECTIVES[id]).toBeDefined()
      expect(BAKE_STYLE_DIRECTIVES[id].typography).toMatch(/^Typography:/)
    }
  })

  it("quotes the exact headline and subline with a spelling lock, in every style", () => {
    for (const id of ALL_STYLES) {
      const prompt = buildBakePrompt(specFor(id))
      expect(prompt).toContain(
        'Render this headline text EXACTLY as written, letter for letter, correct spelling: "Look expensive without trying"'
      )
      expect(prompt).toContain(
        'Render this smaller supporting line EXACTLY, correct spelling: "Three quiet styling moves"'
      )
    }
  })

  it("carries the No-Fake identity rule in every style", () => {
    for (const id of ALL_STYLES) {
      const prompt = buildBakePrompt(specFor(id))
      expect(prompt).toContain(BAKE_IDENTITY_RULE)
      expect(prompt).toContain("Do not alter her face or body in any way")
      expect(prompt).toContain("still her")
    }
  })

  it("keeps 9:16 text inside the middle 65% vertical band, and feed text inside margins", () => {
    const vertical = buildBakePrompt(specFor("editorial-serif-center", { format: "story-slide" }))
    expect(vertical).toContain(BAKE_SAFE_ZONE_VERTICAL)
    expect(vertical).toContain("middle 65% vertical band")

    const feed = buildBakePrompt(specFor("editorial-serif-center", { format: "carousel" }))
    expect(feed).toContain(BAKE_SAFE_ZONE_FEED)
    expect(feed).not.toContain("middle 65% vertical band")
  })

  it("speaks each style's own typography language", () => {
    const expectations: Record<OverlayStyleId, RegExp> = {
      "editorial-serif-center": /elegant serif headline .*magazine cover|hairline rule/i,
      "lower-third-accent": /sitting low in the frame/i,
      "top-band-minimal": /across the top .*negative space|negative space/i,
      "quote-statement": /never a colored box, never a gradient banner/i,
      "series-cover": /repeatable series title/i,
      "cutout-editorial": /cut-paper label strip/i,
    }
    for (const id of ALL_STYLES) {
      expect(buildBakePrompt(specFor(id))).toMatch(expectations[id])
    }
  })

  it("translates the member's marked phrase into the style's accent (underline)", () => {
    const prompt = buildBakePrompt(
      specFor("lower-third-accent", { headline: "I stopped hiding and got *visible*" })
    )
    expect(prompt).toContain('Emphasize ONLY the phrase "visible"')
    expect(prompt).toContain("hand-drawn underline")
    // The exact-text lock renders the words without markers.
    expect(prompt).toContain('correct spelling: "I stopped hiding and got visible"')
    expect(prompt).not.toContain("*")
  })

  it("translates cutout marks into the strip and the circled subline words", () => {
    const prompt = buildBakePrompt({
      headline: "5 Selfie Mistakes *Making Your Photos* Look Cheap",
      subline: "Save this before your *next shoot*",
      position: "top",
      style: "cutout-editorial",
      format: "carousel",
    })
    expect(prompt).toContain('Place ONLY the phrase "Making Your Photos"')
    expect(prompt).toContain("cut-paper label strip")
    expect(prompt).toContain('Circle ONLY the words "next shoot"')
    expect(prompt).toContain("hand-drawn ellipse")
    expect(prompt).not.toContain("*")
  })

  it("shows marked words plain in styles without an accent treatment", () => {
    const prompt = buildBakePrompt(
      specFor("editorial-serif-center", { headline: "I stopped hiding and got *visible*" })
    )
    expect(prompt).toContain('correct spelling: "I stopped hiding and got visible"')
    expect(prompt).not.toContain("Emphasize ONLY")
    expect(prompt).not.toContain("*")
  })

  it("carries the member's position pick as placement guidance", () => {
    expect(buildBakePrompt(specFor("quote-statement", { position: "top" }))).toContain(
      "upper part of the frame"
    )
    expect(buildBakePrompt(specFor("quote-statement", { position: "center" }))).toContain(
      "centered in the frame"
    )
    expect(buildBakePrompt(specFor("quote-statement", { position: "bottom" }))).toContain(
      "lower third of the frame"
    )
  })

  it("locks typographic quality: no warped or misspelled letters, no extra words", () => {
    const prompt = buildBakePrompt(specFor("series-cover"))
    expect(prompt).toMatch(/No misspelled, warped, duplicated, or missing letters/)
    expect(prompt).toMatch(/No extra words, no watermarks, no logos/)
  })

  it("extracts the first marked phrase and tolerates unmarked text", () => {
    expect(bakeMarkedPhrase("plain words only")).toBeNull()
    expect(bakeMarkedPhrase("one *marked phrase* here")).toBe("marked phrase")
    expect(bakeMarkedPhrase(undefined)).toBeNull()
    expect(bakeMarkedPhrase("")).toBeNull()
  })
})

describe("bake route wiring (app/api/app-v3/maya/bake-text)", () => {
  const route = readFileSync("app/api/app-v3/maya/bake-text/route.ts", "utf8")

  it("is no longer gated by the retired Text Studio feature flag", () => {
    expect(route).not.toContain("isTextOverlayLayerEnabled")
    expect(route).toContain("sanitizeTextOverlaySpec(body.spec)")
  })

  it("requires auth and the member/trial generation lock, like the edit route", () => {
    expect(route).toContain("getAuthenticatedUser")
    expect(route).toContain("status: 401")
    expect(route).toContain("canGenerate")
    expect(route).toContain("generation_locked")
  })

  it("always bakes from the clean base and never from a previous baked result", () => {
    // The only image input is cleanImageUrl (validated blob URL); no baked URL is accepted.
    expect(route).toContain("cleanImageUrl?: string")
    expect(route).toContain("isAllowedImageUrl(body.cleanImageUrl)")
    expect(route).toContain("loadImage(cleanImageUrl)")
    expect(route).not.toMatch(/body\.bakedUrl/)
    expect(route).toContain(
      "buildBakePrompt(spec, styleAdjustments ? { styleAdjustments } : undefined)"
    )
    expect(route).toContain("sanitizeTextOverlaySpec(body.spec)")
  })

  it("runs exactly ONE images.edit pass (no retries, no chained edits)", () => {
    expect(route.match(/await openai\.images\.edit\(/g) ?? []).toHaveLength(1)
  })

  it("copies the edit route's credits behavior: check, deduct, refund on every failure", () => {
    expect(route).toContain("checkCredits(neonUser.id, CREDIT_COSTS.IMAGE)")
    expect(route).toContain('code: "insufficient_credits"')
    expect(route).toContain('deductCredits(neonUser.id, CREDIT_COSTS.IMAGE, "image"')
    // Refunds on: missing key, bake failure, blob failure.
    expect(route.match(/refundCredits\(/g)?.length).toBeGreaterThanOrEqual(3)
    expect(route).toContain("newBalance: deduction.newBalance")
  })

  it("logs the behavior-only bake events", () => {
    expect(route).toContain('"suite_text_bake_requested"')
    expect(route).toContain('"suite_text_bake_failed"')
    // Money never comes from analytics: the route only reports behavior properties.
    expect(route).not.toMatch(/eventName:\s*"purchase"/)
  })
})

describe("analytics contract", () => {
  it("allows the two new bake events (behavior only)", () => {
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("suite_text_bake_requested")
    expect(ALLOWED_ANALYTICS_EVENTS).toContain("suite_text_bake_failed")
  })
})

describe("retired Text Studio client", () => {
  it("keeps the old manual studio deleted while the bake route remains for Maya chat edits", () => {
    expect(existsSync("components/app-v3/text-studio.tsx")).toBe(false)
    expect(readFileSync("components/app-v3/maya-concierge.tsx", "utf8")).not.toContain("<TextStudio")
    expect(readFileSync("components/app-v3/concept-card.tsx", "utf8")).not.toContain(
      "downloadImageWithOverlay"
    )
    expect(readFileSync("components/app-v3/image-lightbox.tsx", "utf8")).not.toContain(
      "TextOverlayLayer"
    )
  })
})
