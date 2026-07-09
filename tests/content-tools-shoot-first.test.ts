import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("Content tools shoot-first workflow", () => {
  const root = process.cwd()
  const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

  it("uses approved shoots and overlay uploads for admin carousels and stories", () => {
    const adminPage = read("app/admin/content-brief/page.tsx")
    const carouselClient = read("components/admin/content-kit-client.tsx")
    const storyClient = read("components/admin/content-story-client.tsx")
    const carouselGenerator = read("lib/content-kit/carousel-generator.ts")
    const storyGenerator = read("lib/content-kit/story-generator.ts")
    const uploadRoute = read("app/api/admin/content-kit/assets/upload/route.ts")
    const types = read("lib/content-kit/types.ts")
    const shootGenerator = read("lib/content-kit/shoot-generator.ts")
    const shootStudioClient = read("components/admin/shoot-studio-client.tsx")

    expect(adminPage).toContain("shootOptions")
    expect(adminPage).not.toContain("Your selfie")
    expect(carouselClient).toContain("sourceShootId")
    expect(carouselClient).toContain("overlayUrls")
    // Carousel kit now has the gallery/favorites picker + the slide editor (parity with stories).
    expect(carouselClient).toContain("Add from gallery")
    expect(carouselClient).toContain("CarouselSlideEditor")
    expect(carouselGenerator).toContain("export async function updateCarouselSlides")
    // Both render styles exist (A = baked magazine look, B = editable local composite), toggled.
    expect(carouselGenerator).toContain("compositePhotoshootCarouselSlides")
    expect(carouselGenerator).toContain("redesignPhotoshootCarouselSlides")
    expect(carouselGenerator).toContain('input.renderStyle === "editable"')
    expect(carouselClient).toContain("AI design (magazine)")
    expect(storyClient).toContain("sourceShootId")
    expect(storyClient).toContain("overlayUrls")
    expect(storyClient).toContain('fetch("/api/app-v3/gallery")')
    expect(storyClient).toContain("Selected story backgrounds")
    expect(storyClient).toContain("removeBackground")
    expect(storyClient).toContain("reorderAssets")
    expect(storyClient).toContain("dropBackground")
    expect(storyClient).toContain("Drag to reorder")
    expect(adminPage).toContain("getPublishedVaultCollections")
    expect(carouselGenerator).toContain("getPublishedVaultCollectionBySourceShootId")
    expect(storyGenerator).toContain("getPublishedVaultCollectionBySourceShootId")
    expect(carouselGenerator).toContain(
      "Approve at least ${minApprovedImages} rendered shoot image"
    )
    expect(storyGenerator).toContain(
      "selectedImageUrls.length > 0 ? selectedImageUrls : sourceShoot.imageUrls"
    )
    expect(uploadRoute).toContain("content-kit/${kind")
    expect(types).toContain("overlayAssets?: ContentOverlayAsset[]")
    expect(types).toContain("promptNumber?: string | null")
    expect(shootGenerator).toContain("published_prompt_numbers")
    expect(shootGenerator).toContain("ensurePublishedVaultPromptNumbers")
    expect(shootStudioClient).toContain("Prompt #{shot.promptNumber}")
    expect(shootStudioClient).toContain("Copy #${giveawayShot.promptNumber}")
  })

  it("renders admin stories with the deterministic local overlay, not a baked image", () => {
    const storyGenerator = read("lib/content-kit/story-generator.ts")
    const renderer = read("app/api/admin/content-kit/story/[id]/[slide]/route.tsx")
    const types = read("lib/content-kit/types.ts")

    // STORY-OVERLAY-01: composite over the real selected photo, never regenerate it via gpt-image-2.
    expect(storyGenerator).toContain("compositeStorySlides")
    expect(storyGenerator).toContain('headlineRender: "composited"')
    expect(storyGenerator).not.toContain("redesignContentSlide")
    expect(storyGenerator).not.toContain("pickContentStyleReference")

    // Renderer: IG safe zones + zone-local scrim (never a full-height gradient over the face).
    expect(renderer).toContain("TEXT_BOTTOM")
    expect(renderer).toContain("slide.textZone")
    expect(renderer).not.toContain("rgba(10,10,10,0.86) 100%")

    // Types carry the new composited controls.
    expect(types).toContain('textZone?: "top" | "bottom"')

    // STORY-OVERLAY-02: a vision pass picks placement (zone/align/crop) per photo; the renderer obeys.
    expect(storyGenerator).toContain("callContentKitVision")
    expect(storyGenerator).toContain("analyzeBackgroundForOverlay")
    expect(renderer).toContain("slide.objectPosition")
    expect(renderer).toContain("slide.textAlign")
    expect(types).toContain("objectPosition?: string")

    // STORY-OVERLAY-03: the slide editor (move/resize/edit/swap) persists via updateStorySlides.
    const storiesRoute = read("app/api/admin/content-kit/stories/route.ts")
    const editor = read("components/admin/story-slide-editor.tsx")
    expect(storyGenerator).toContain("export async function updateStorySlides")
    expect(storiesRoute).toContain("updateStorySlides")
    const storyClientForEditor = read("components/admin/content-story-client.tsx")
    expect(storyClientForEditor).toContain("StorySlideEditor")
    expect(storyClientForEditor).toContain("Save all to device")
    expect(storyClientForEditor).toContain("function downloadAll")
    expect(editor).toContain("onPointerMove")
    expect(renderer).toContain("textScale")
    expect(types).toContain("textOffsetX?: number")

    // 2026-07-04 Story Engine rebuild: a CTA is now OPTIONAL, driven by what Sandra typed as
    // today's story idea (personal moment vs. announcement), not forced by the code. Still
    // capped at 12 slides via targetSlides, and a CTA slide (when present) still gets a paid
    // keyword normalized onto it.
    expect(storyGenerator).toContain("assembleSlides")
    expect(storyGenerator).toContain("PAID_CTA_KEYWORDS")
    expect(storyGenerator).toContain("targetSlides")
    expect(storyGenerator).not.toContain("raw.slice(0, 8)")
    expect(storyGenerator).not.toContain("DEFAULT_CTA_SLIDE")
    expect(storyGenerator).not.toContain("assembleWithCta")
    expect(types).toContain('| "close"')
  })

  it("keeps member Maya carousels photoshoot-first by default", () => {
    const designSystems = read("lib/app-v3/maya/carousel-design-systems.ts")
    const compiler = read("lib/app-v3/prompt-compiler.ts")

    expect(designSystems).toContain("real-image redesigns")
    expect(compiler).toContain("buildGraphicRedesignSlides")
  })

  it("Content Kit story sequences are no longer forced into a sales arc (2026-07-04)", () => {
    // This is the generator behind the dedicated "Story sequences" panel in Content Kit
    // (POST /api/admin/content-kit/stories). Sandra was actively using this exact panel and
    // hitting the old forced-CTA sales arc.
    const storyGenerator = read("lib/content-kit/story-generator.ts")
    const storiesRoute = read("app/api/admin/content-kit/stories/route.ts")

    expect(storiesRoute).toContain("generateStorySequence")

    // The rigid mandatory arc (hook -> tension -> shift -> proof -> desire -> bridge -> cta,
    // ALWAYS ending in a paid CTA) is gone.
    expect(storyGenerator).not.toContain("ALWAYS ending in the CTA")
    expect(storyGenerator).not.toContain("Every sequence MUST end with this CTA")
    expect(storyGenerator).not.toContain(
      'Write the story across exactly ${targetSlides} slides following the doctrine arc. The FINAL slide MUST be the CTA slide'
    )

    // The offer is now optional, decided from what Sandra actually typed as the story idea.
    expect(storyGenerator).toContain("CONNECTION sequence")
    expect(storyGenerator).toContain("ANNOUNCEMENT sequence")
    expect(storyGenerator).toContain('ending in role "close"')
    expect(storyGenerator).toContain("Do not default to")

    // Real Story Bank grounding is wired in, same as the daily brief rebuild.
    expect(storyGenerator).toContain("storyBankBlock()")

    // The UI no longer implies every story needs a CTA in its example placeholder.
    const storyClient = read("components/admin/content-story-client.tsx")
    expect(storyClient).not.toContain("CTA: PROMPT")
  })

  it("SHOOT-TREND-PRESET-01: surfaces this week's trend radar as Shoot Studio vibe presets", () => {
    const route = read("app/api/admin/content-kit/trend-vibes/route.ts")
    const shootClient = read("components/admin/shoot-studio-client.tsx")
    const briefClient = read("components/admin/content-brief-client.tsx")

    // Admin-gated, same pattern as the other content-kit routes.
    expect(route).toContain("requireAdmin")
    expect(route).toContain('{ error: "Unauthorized" }')
    // "This week only" per Sandra - a freshness window, not an accumulating library.
    expect(route).toContain("THIS_WEEK_MAX_AGE_MS")
    expect(route).toContain("age > THIS_WEEK_MAX_AGE_MS")
    // Only trends with a synthesized vibe preset become chips (some trends are pure content
    // mechanics with nothing to shoot differently).
    expect(route).toContain("Boolean(entry?.vibePreset?.trim())")

    // Shoot Studio fetches on mount and renders the trend chips alongside the static presets.
    expect(shootClient).toContain('fetch("/api/admin/content-kit/trend-vibes")')
    expect(shootClient).toContain("trendVibes")
    expect(shootClient).toContain("onClick={() => setVibe(entry.vibePreset)}")
    expect(shootClient).toContain("This week&apos;s trends")

    // The brief page surfaces the same vibe preset text for Sandra to audit.
    expect(briefClient).toContain("Shoot Studio vibe preset:")
    expect(briefClient).toContain("this week only")
  })

  it("raises the Shoot Studio selfie cap from 4 to 6, end to end (2026-07-05)", () => {
    const shootClient = read("components/admin/shoot-studio-client.tsx")
    const shootGenerator = read("lib/content-kit/shoot-generator.ts")

    // UI: selection toggle, auto-select-after-upload, and the picker's own label.
    expect(shootClient).not.toContain("current, url].slice(0, 4)")
    expect(shootClient).toContain("current, url].slice(0, 6)")
    expect(shootClient).not.toContain("...urls])).slice(0, 4)")
    expect(shootClient).toContain("...urls])).slice(0, 6)")
    expect(shootClient).toContain("Pick up to 6")

    // Backend: createShootDraft's accepted input cap and generateShotImage's actual
    // identity-reference cap sent to gpt-image-2 - the one that really matters.
    expect(shootGenerator).not.toContain("input.selfieUrls.filter(Boolean).slice(0, 4)")
    const capOccurrences = shootGenerator.match(/input\.selfieUrls\.filter\(Boolean\)\.slice\(0, 6\)/g) || []
    expect(capOccurrences.length).toBe(2)
  })

  it("wires slide position into the graphic redesign call so story-sequence gets beat framing (2026-07-06)", () => {
    const generateRoute = read("app/api/app-v3/maya/generate/route.ts")
    const slideRedesignGenerator = read("lib/content-kit/slide-redesign-generator.ts")

    expect(generateRoute).toContain("slideIndex: index")
    expect(generateRoute).toContain("totalSlides: graphicJobs.length")
    expect(slideRedesignGenerator).toContain("storyBeatFraming")
    expect(slideRedesignGenerator).toContain("reelCoverShotFraming")
    expect(slideRedesignGenerator).toContain("identityScenePolish")
  })

  it("wraps the selfie picker instead of clipping the upload button off-screen (2026-07-06)", () => {
    // Sandra reported the selfie upload "+" looked missing once she already had 5-6 selected.
    // Root cause: a fixed maxWidth + overflow-x-auto row scrolled the trailing "+" tile out of
    // view with no visible scroll affordance. The inspiration row one section above never had
    // this bug because it wraps - matched that pattern here instead of scrolling.
    const shootClient = read("components/admin/shoot-studio-client.tsx")
    expect(shootClient).not.toContain('overflow-x-auto pb-1" style={{ maxWidth: "24rem" }}')
    expect(shootClient).toContain("flex flex-wrap gap-2 pb-1")
  })
})
