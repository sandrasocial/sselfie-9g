// @vitest-environment node

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("App V3 image reliability persistence", () => {
  it("generation saves readable titles and keeps auto-baked text variants linked to the clean image", () => {
    const route = read("app/api/app-v3/maya/generate/route.ts")

    expect(route).toContain("title, variant_of")
    expect(route).toContain("imageTitle")
    expect(route).toContain("${imageTitle}, ${null}")
    expect(route).toMatch(
      /const variantOf:\s*number \| null\s*=\s*persisted\[index\]\?\.id \?\? null/
    )
    expect(route).toContain("bakedAiImageIds")
  })

  it("manual text baking and edits keep variant lineage instead of creating anonymous gallery rows", () => {
    const bakeRoute = read("app/api/app-v3/maya/bake-text/route.ts")
    const editRoute = read("app/api/app-v3/maya/edit/route.ts")

    expect(bakeRoute).toContain("cleanImageId?: number")
    expect(bakeRoute).toContain("variant_of")
    expect(bakeRoute).toContain("aiImageId: insertedId")

    expect(editRoute).toContain("sourceImageId?: number")
    expect(editRoute).toContain("sourceTitle?: string")
    expect(editRoute).toContain("'openai', ${format}, NOW()")
    expect(editRoute).not.toContain("'openai', 'edit', NOW()")
    expect(editRoute).toContain("aiImageId: insertedId")
  })

  it("gallery data exposes title and variant metadata for the Photos tab", () => {
    const images = read("lib/data/images.ts")
    const assets = read("lib/app-v3/gallery-assets.ts")
    const gallery = read("components/app-v3/gallery-view.tsx")

    expect(images).toContain("title?: string")
    expect(images).toContain("variant_of?: number")
    expect(images).toContain("title,")
    expect(images).toContain("variant_of")

    expect(assets).toContain("title?: string | null")
    expect(assets).toContain("variantOf?: string | null")
    expect(assets).toContain("title: image.title || null")
    expect(assets).toContain("variantOf: image.variant_of")

    expect(gallery).toContain("asset.title")
    expect(gallery).toContain("Variant")
  })
})

describe("Maya style chooser slice", () => {
  it("offers inspiration-image and Maya-decides paths inside the inline style picker", () => {
    const inline = read("components/app-v3/maya-inline-components.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(inline).toContain("Use my inspiration")
    expect(inline).toContain("Let Maya decide")
    expect(inline).toContain("onUseInspiration")
    expect(inline).toContain("onLetMayaDecide")

    expect(concierge).toContain("handleInlineUseInspiration")
    expect(concierge).toContain("handleInlineMayaDecides")
    expect(concierge).toContain("maya-decides")
  })
})
