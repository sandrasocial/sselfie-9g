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
    expect(storyClient).toContain("sourceShootId")
    expect(storyClient).toContain("overlayUrls")
    expect(storyClient).toContain('fetch("/api/app-v3/gallery")')
    expect(storyClient).toContain("Selected story backgrounds")
    expect(storyClient).toContain("removeBackground")
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

  it("keeps member Maya carousels photoshoot-first by default", () => {
    const designSystems = read("lib/app-v3/maya/carousel-design-systems.ts")
    const compiler = read("lib/app-v3/prompt-compiler.ts")
    const chatRoute = read("app/api/app-v3/maya/chat/route.ts")

    expect(designSystems).toContain("real-image redesigns")
    expect(compiler).toContain("buildGraphicRedesignSlides")
    expect(chatRoute).toContain("CURRENT WEEKLY BRIEF CONTEXT")
  })
})
