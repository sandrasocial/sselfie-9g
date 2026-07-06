// @vitest-environment node

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { makeTextOverlaySpec } from "@/lib/app-v3/text-overlay"

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

  it("never trusts a client-sent parent image id: variant_of is ownership-scoped in SQL", () => {
    const bakeRoute = read("app/api/app-v3/maya/bake-text/route.ts")
    const editRoute = read("app/api/app-v3/maya/edit/route.ts")

    expect(bakeRoute).toContain(
      "(SELECT id FROM ai_images WHERE id = ${cleanImageId} AND user_id = ${neonUser.id})"
    )
    expect(editRoute).toContain(
      "(SELECT id FROM ai_images WHERE id = ${sourceImageId} AND user_id = ${neonUser.id})"
    )
    // The raw client value must never be inserted directly as variant_of.
    expect(bakeRoute).not.toContain("${imageTitle}, ${cleanImageId},")
    expect(editRoute).not.toContain("${imageTitle}, ${sourceImageId},")
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

describe("generation robustness (2026-07-06 gap closure)", () => {
  it("keeps gallery row ids in draft snapshots so variant lineage survives reloads", () => {
    const serverSnapshot = read("lib/app-v3/maya/draft-snapshot.ts")
    const clientContinuity = read("components/app-v3/continuity.ts")
    for (const source of [serverSnapshot, clientContinuity]) {
      expect(source).toContain("aiImageIds")
      expect(source).toContain("aiImageId")
    }
  })

  it("anchors multi-slide graphics with an in-memory data URL, never a second blob upload", () => {
    const route = read("app/api/app-v3/maya/generate/route.ts")
    expect(route).toContain("data:image/png;base64,${heroBuffer.toString(\"base64\")}")
    expect(route).not.toContain("graphic-hero-${Date.now()}")
    // A data URL must never leak into the stored prompt record (megabytes of base64).
    expect(route).toContain("in-memory hero anchor")
  })

  it("retries once on transient OpenAI failures without stacking content-policy retries", () => {
    const route = read("app/api/app-v3/maya/generate/route.ts")
    expect(route).toContain("isTransientOpenAIError")
    expect(route).toContain("status >= 500 || status === 429")
    // Content-policy errors are explicitly excluded from the transient class.
    expect(route).toMatch(/if \(isContentPolicyError\(error\)\) return false/)
  })

  it("rejects too-small identity selfies with a warm message, inspiration exempt", () => {
    const route = read("app/api/app-v3/upload-selfie/route.ts")
    expect(route).toContain("MIN_IDENTITY_SHORT_SIDE = 512")
    expect(route).toContain('code: "image_too_small"')
    expect(route).toContain("IDENTITY_TYPES.has(imageType)")
    // Inspiration steers style, not likeness — it must not be resolution-gated.
    expect(route).not.toContain('IDENTITY_TYPES = new Set(["selfie", "three-quarter", "side-profile", "full-body", "inspiration"])')
  })

  it("labels attached reference roles only behind the APP_V3_REF_LABELING flag", () => {
    const route = read("app/api/app-v3/maya/generate/route.ts")
    expect(route).toContain("APP_V3_REF_LABELING")
    expect(route).toContain("referenceRoleLabels")
    expect(route).toContain("only source for her face")
  })

  it("trims only runaway baked headlines at a word boundary, leaving normal ones intact", () => {
    const normal = makeTextOverlaySpec({
      heading: "Look expensive without trying",
      role: "value",
      format: "reel-cover",
    })
    expect(normal.headline).toBe("Look expensive without trying")

    const runaway = makeTextOverlaySpec({
      heading:
        "This is a very long headline that keeps going and going far past the reliable baked text zone for the model",
      role: "value",
      format: "reel-cover",
    })
    expect(runaway.headline.split(" ").length).toBe(12)
    expect(runaway.headline).toBe(
      "This is a very long headline that keeps going and going far"
    )
  })
})

describe("Maya style chooser slice", () => {
  it("offers inspiration-image and Maya-decides paths inside the inline style picker", () => {
    const inline = read("components/app-v3/maya-inline-components.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(inline).toContain("Use my inspiration")
    // Renamed 2026-07-06 (UX audit #4): a preview, not a blind commitment.
    expect(inline).toContain("Not sure? Let Maya suggest looks")
    expect(inline).toContain("onUseInspiration")
    expect(inline).toContain("onLetMayaDecide")

    expect(concierge).toContain("handleInlineUseInspiration")
    expect(concierge).toContain("handleInlineMayaDecides")
    expect(concierge).toContain("maya-decides")
  })
})
