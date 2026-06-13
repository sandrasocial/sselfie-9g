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

    expect(adminPage).toContain("shootOptions")
    expect(adminPage).not.toContain("Your selfie")
    expect(carouselClient).toContain("sourceShootId")
    expect(carouselClient).toContain("overlayUrls")
    expect(storyClient).toContain("sourceShootId")
    expect(storyClient).toContain("overlayUrls")
    expect(carouselGenerator).toContain("Approve at least 2 rendered shoot images")
    expect(storyGenerator).toContain("Approve at least 2 rendered shoot images")
    expect(uploadRoute).toContain("content-kit/${kind")
    expect(types).toContain("overlayAssets?: ContentOverlayAsset[]")
  })

  it("keeps member Maya carousels photoshoot-first by default", () => {
    const designSystems = read("lib/app-v3/maya/carousel-design-systems.ts")
    const compiler = read("lib/app-v3/prompt-compiler.ts")
    const chatRoute = read("app/api/app-v3/maya/chat/route.ts")

    expect(designSystems).toContain("PHOTOSHOOT-FIRST DEFAULT")
    expect(designSystems).toContain("return role === \"value\" || role === \"hook\" || role === \"cta\" ? \"identity\" : \"detail\"")
    expect(compiler).toContain("if (identityCount > 4) visual = \"detail\"")
    expect(chatRoute).toContain("CURRENT WEEKLY BRIEF CONTEXT")
  })
})
