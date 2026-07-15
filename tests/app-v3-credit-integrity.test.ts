import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

// CREDIT-INTEGRITY-01 (2026-07-15): a member ran three full photoshoots, the app said
// "loading failed" every time, the server finished every set into her gallery, and she was
// charged 24 credits for photos she never saw. These tests pin the whole contract:
// charge, stored images, and refunds share one requestRef; a reconcile job returns credits
// for anything that never reached the gallery; the client never claims failure while the
// shoot may still be landing.
describe("app-v3 generation credit integrity", () => {
  const route = read("app/api/app-v3/maya/generate/route.ts")

  it("ties the charge, stored images, and refunds together with one requestRef", () => {
    expect(route).toContain("const requestRef = `app-v3-gen-${neonUser.id}-${clientRequestId}`")
    // the deduction carries the ref into credit_transactions.reference_id
    expect(route).toMatch(
      /deductCredits\(\s*neonUser\.id,\s*totalCost,\s*"image",\s*`app-v3 \$\{format\}: \$\{label\}`,\s*requestRef\s*\)/
    )
    // refunds key off the same ref
    expect(route).toContain("const refundRef = requestRef")
    // every stored image carries the ref in prediction_id, so delivery is provable per charge
    expect(route).toContain('${requestRef + "-" + i}')
  })

  it("never swallows a failed refund silently", () => {
    expect(route).toContain("const refundOrAlert = async (")
    expect(route).toContain('toolName: "app-v3-generate-refund"')
    // no direct refundCredits call in the route may hide its failure with an empty catch
    expect(route).not.toMatch(
      /refundCredits\([^)]*\)[\s\S]{0,40}?\.catch\(\s*\(\)\s*=>\s*\{\}\s*\)/
    )
  })

  it("returns credits for images that reached Blob but never the gallery", () => {
    expect(route).toContain(
      "const missingFromGallery = persisted.filter(p => p.id === null).length"
    )
    expect(route).toContain("never reached the gallery")
    expect(route).toContain("${refundRef}-partial")
  })

  it("reconciles charged-but-undelivered generations on a cron so a dead function cannot keep her credits", () => {
    const lib = read("lib/generation/reconcile-app-v3-credits.ts")
    expect(lib).toContain("reference_id LIKE 'app-v3-gen-%'")
    expect(lib).toContain("ai.prediction_id LIKE ct.reference_id || '-%'")
    expect(lib).toMatch(
      /r\.reference_id = ct\.reference_id\s+OR r\.reference_id LIKE ct\.reference_id \|\| '-%'/
    )
    expect(lib).toContain("${charge.reference_id}-reconcile")
    // only settles runs old enough that the 300s function ceiling has passed
    expect(lib).toContain("minAgeMinutes = input?.minAgeMinutes ?? 15")

    const cron = read("app/api/cron/reconcile-generation-assets/route.ts")
    expect(cron).toContain("reconcileAppV3GenerationCredits")
    expect(cron).toContain("creditSummary")
    // it must run every invocation, not only on the 15-minute full sweep
    const creditCallIndex = cron.indexOf("reconcileAppV3GenerationCredits({")
    const fullSweepIndex = cron.indexOf("if (shouldRunFeedAndAi)")
    expect(creditCallIndex).toBeGreaterThan(-1)
    expect(fullSweepIndex).toBeGreaterThan(-1)
    expect(creditCallIndex).toBeLessThan(fullSweepIndex)
  })

  it("filters settled charges before applying the reconciliation limit", () => {
    const lib = read("lib/generation/reconcile-app-v3-credits.ts")
    expect(lib).toContain("WITH generation_charges AS")
    expect(lib).toContain("WHERE charged > delivered + refunded")
    expect(lib.indexOf("WHERE charged > delivered + refunded")).toBeLessThan(
      lib.indexOf("LIMIT ${limit}")
    )
  })

  it("reconciles custom-model images and Motion against durable delivery records", () => {
    const lib = read("lib/generation/reconcile-app-v3-credits.ts")
    const customModel = read("lib/maya/trained-model-generation-service.ts")
    const video = read("lib/maya/video-generation-service.ts")
    const migration = read("migrations/add-generated-videos-credit-reference.sql")

    expect(lib).toContain("ct.reference_id LIKE 'app-v3-custom-model-%'")
    expect(lib).toContain("ct.reference_id LIKE 'app-v3-video-%'")
    expect(lib).toContain("v.credit_reference_id = ct.reference_id")
    // A completed Motion is one asset worth the full animation charge, not one image credit.
    // Without this weighting the safety net would incorrectly return nine of ten credits.
    expect(lib).toContain("COUNT(*)::int * ${CREDIT_COSTS.ANIMATION}")
    expect(customModel).toContain("${metadata.credit_reference_id || input.predictionId}")
    expect(video).toContain("credit_reference_id,")
    expect(video).toContain("${requestRef},")
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS credit_reference_id")
  })

  it("covers edit, standalone text bake, and auto-bake with the same delivery contract", () => {
    const edit = read("app/api/app-v3/maya/edit/route.ts")
    const bake = read("app/api/app-v3/maya/bake-text/route.ts")

    for (const source of [edit, bake]) {
      expect(source).toContain("const requestRef = `app-v3-gen-${neonUser.id}-${")
      expect(source).toMatch(/deductCredits\([\s\S]*?requestRef\s*\)/)
      expect(source).toContain('${requestRef + "-0"}')
      expect(source).toContain("const refundOrAlert = async (")
      expect(source).not.toMatch(
        /refundCredits\([^)]*\)[\s\S]{0,40}?\.catch\(\s*\(\)\s*=>\s*\{\}\s*\)/
      )
    }

    expect(route).toContain("const bakeRequestRef = `app-v3-gen-${neonUser.id}-${")
    expect(route).toMatch(/deductCredits\([\s\S]*?auto bake:[\s\S]*?bakeRequestRef\s*\)/)
    expect(route).toContain('${bakeRequestRef + "-" + index}')
  })

  it("recovers a photoshoot from the gallery after a lost response instead of claiming failure", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(concierge).toContain("async function recoverPhotoshootFromGallery(")
    expect(concierge).toContain("gotServerVerdict = data !== null")
    expect(concierge).toContain(
      'trackGenerationCompleted("photoshoot", "photoshoot_set_recovered")'
    )
    expect(concierge).toContain('trackRecoveryShown("photoshoot", "lost_response")')
    // a real server verdict (content policy, refund already issued) still shows the real error
    expect(concierge).toContain('trackRecoveryShown("photoshoot", "exception")')
    // honest no-uncertainty copy: her credits come back on their own
    expect(concierge).toContain("come back on their own")
  })

  it("recovers only the exact photoshoot request, including parsed server failures", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const galleryAssets = read("lib/app-v3/gallery-assets.ts")
    const images = read("lib/data/images.ts")

    expect(concierge).toContain("const clientRequestId = newGenerationRequestId()")
    expect(concierge).toContain("clientRequestId,")
    expect(concierge).toContain("asset.generationRef?.includes(clientRequestId)")
    expect(concierge).toContain("shouldAttemptRecovery")
    expect(galleryAssets).toContain("generationRef?: string | null")
    expect(images).toContain("prediction_id: img.prediction_id")
  })
})
