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
    expect(carouselGenerator).toContain("compositePhotoshootCarouselSlides")
    expect(carouselGenerator).not.toContain("redesignPhotoshootCarouselSlides")
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

    // Every sequence must end in a paid CTA and is no longer capped at 8 slides.
    expect(storyGenerator).toContain("assembleWithCta")
    expect(storyGenerator).toContain("PAID_CTA_KEYWORDS")
    expect(storyGenerator).toContain("targetSlides")
    expect(storyGenerator).not.toContain("raw.slice(0, 8)")
  })

  it("keeps member Maya carousels photoshoot-first by default", () => {
    const designSystems = read("lib/app-v3/maya/carousel-design-systems.ts")
    const compiler = read("lib/app-v3/prompt-compiler.ts")
    const chatRoute = read("app/api/app-v3/maya/chat/route.ts")

    expect(designSystems).toContain("real-image redesigns")
    expect(compiler).toContain("buildGraphicRedesignSlides")
    expect(chatRoute).toContain("CURRENT WEEKLY BRIEF CONTEXT")
  })
})
