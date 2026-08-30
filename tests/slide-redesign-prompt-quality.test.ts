// @vitest-environment node
//
// 2026-07-06 prompt-quality audit fixes for the LIVE reel-cover/story-slide/carousel/story-
// sequence render path (buildContentSlideRedesignPrompt, behind redesignContentSlideToBuffer).
// Three gaps found: (1) no universal quality/lighting/makeup anchor when a NEW scene is being
// built (identity-scene mode) - unlike photo/photoshoot, which always get these; (2) reel-cover
// had no explicit "hold space for a headline" shot framing; (3) story-sequence slides generated
// without a preserved background photo had no beat-position awareness (opening/middle/closing),
// so every generated slide in a set defaulted to the same shot distance and mood.

import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { buildContentSlideRedesignPrompt } from "@/lib/content-kit/slide-redesign-generator"

const baseSlide = {
  kind: "photo" as const,
  title: "This is where I started again",
}

describe("buildContentSlideRedesignPrompt quality anchors", () => {
  it("adds the quality/lighting/makeup anchor only when a new scene is actually being built", () => {
    const identityScene = buildContentSlideRedesignPrompt({
      category: "photoshoot-carousel",
      topic: "founder story",
      referenceMode: "identity-scene",
      slide: baseSlide,
    })
    expect(identityScene).toContain("follow the light source named in the slide-specific scene")
    expect(identityScene).toContain("light the person with the scene's own light")
    expect(identityScene).toContain("Shoot this like a real photographer")
    expect(identityScene).toContain("Identity references define WHO she is")
    expect(identityScene).toContain("natural skin texture with pores visible")
    expect(identityScene).toContain("Avoid: distorted hands")
    expect(identityScene).toContain("vertical 4:5 Instagram carousel format")
    expect(identityScene).not.toContain("soft window light or golden-hour warmth")

    const preservedPhoto = buildContentSlideRedesignPrompt({
      category: "story-sequence",
      topic: "founder story",
      referenceMode: "preserve-frame",
      slide: baseSlide,
    })
    expect(preservedPhoto).not.toContain("follow the light source named in the slide-specific scene")
    expect(preservedPhoto).not.toContain("light the person with the scene's own light")
    expect(preservedPhoto).not.toContain("Avoid: distorted hands")
  })

  it("gives reel-cover an explicit cover-safe-hero shot instruction when building a new scene", () => {
    const reelCover = buildContentSlideRedesignPrompt({
      category: "reel-cover",
      topic: "the settings that change the shot",
      referenceMode: "identity-scene",
      slide: baseSlide,
    })
    expect(reelCover).toContain("cover-safe hero")
    expect(reelCover).toContain("negative space reserved at the top or center for a headline")

    const carousel = buildContentSlideRedesignPrompt({
      category: "photoshoot-carousel",
      topic: "founder story",
      referenceMode: "identity-scene",
      slide: baseSlide,
    })
    expect(carousel).not.toContain("cover-safe hero")
  })

  it("frames story-sequence slides by beat position only when generating (not preserving) a photo", () => {
    const opening = buildContentSlideRedesignPrompt({
      category: "story-sequence",
      topic: "her real story",
      referenceMode: "identity-scene",
      slide: baseSlide,
      slideIndex: 0,
      totalSlides: 5,
    })
    expect(opening).toContain("opening frame of a 5-slide story sequence")

    const middle = buildContentSlideRedesignPrompt({
      category: "story-sequence",
      topic: "her real story",
      referenceMode: "identity-scene",
      slide: baseSlide,
      slideIndex: 2,
      totalSlides: 5,
    })
    expect(middle).toContain("middle frame (3 of 5)")

    const closing = buildContentSlideRedesignPrompt({
      category: "story-sequence",
      topic: "her real story",
      referenceMode: "identity-scene",
      slide: baseSlide,
      slideIndex: 4,
      totalSlides: 5,
    })
    expect(closing).toContain("closing frame of the sequence")

    // No beat framing when the slide index/total aren't known, or when the photo is preserved
    // (a member-selected background photo has its own real framing already).
    const noPositionInfo = buildContentSlideRedesignPrompt({
      category: "story-sequence",
      topic: "her real story",
      referenceMode: "identity-scene",
      slide: baseSlide,
    })
    expect(noPositionInfo).not.toContain("story sequence:")
    expect(noPositionInfo).not.toContain("closing frame")

    const preserved = buildContentSlideRedesignPrompt({
      category: "story-sequence",
      topic: "her real story",
      referenceMode: "preserve-frame",
      slide: baseSlide,
      slideIndex: 0,
      totalSlides: 5,
    })
    expect(preserved).not.toContain("opening frame")
  })

  it("uses the selfie as an identity reference for generated story sequences", () => {
    const generatedStory = buildContentSlideRedesignPrompt({
      category: "story-sequence",
      topic: "her real story",
      referenceMode: "identity-scene",
      slide: baseSlide,
      slideIndex: 0,
      totalSlides: 5,
    })

    expect(generatedStory).toContain("The FIRST reference image is the identity reference")
    expect(generatedStory).toContain("Build a new slide-specific editorial scene")
    expect(generatedStory).not.toContain("The FIRST reference image is the exact story background photo")
    expect(generatedStory).not.toContain("Preserve the original photo exactly")
  })
})
