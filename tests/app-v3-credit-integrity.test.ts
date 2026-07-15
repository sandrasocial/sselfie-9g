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
    expect(route).toContain("const requestRef = `app-v3-gen-${neonUser.id}-${Date.now()}`")
    // the deduction carries the ref into credit_transactions.reference_id
    expect(route).toMatch(/deductCredits\(\s*neonUser\.id,\s*totalCost,\s*"image",\s*`app-v3 \$\{format\}: \$\{label\}`,\s*requestRef\s*\)/)
    // refunds key off the same ref
    expect(route).toContain("const refundRef = requestRef")
    // every stored image carries the ref in prediction_id, so delivery is provable per charge
    expect(route).toContain('${requestRef + "-" + i}')
  })

  it("never swallows a failed refund silently", () => {
    expect(route).toContain("const refundOrAlert = async (")
    expect(route).toContain('toolName: "app-v3-generate-refund"')
    // no direct refundCredits call in the route may hide its failure with an empty catch
    expect(route).not.toMatch(/refundCredits\([^)]*\)[\s\S]{0,40}?\.catch\(\s*\(\)\s*=>\s*\{\}\s*\)/)
  })

  it("returns credits for images that reached Blob but never the gallery", () => {
    expect(route).toContain("const missingFromGallery = persisted.filter(p => p.id === null).length")
    expect(route).toContain("never reached the gallery")
    expect(route).toContain("${refundRef}-partial")
  })

  it("reconciles charged-but-undelivered generations on a cron so a dead function cannot keep her credits", () => {
    const lib = read("lib/generation/reconcile-app-v3-credits.ts")
    expect(lib).toContain("reference_id LIKE 'app-v3-gen-%'")
    expect(lib).toContain("ai.prediction_id LIKE ct.reference_id || '-%'")
    expect(lib).toContain("r.reference_id = ct.reference_id OR r.reference_id LIKE ct.reference_id || '-%'")
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

  it("recovers a photoshoot from the gallery after a lost response instead of claiming failure", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(concierge).toContain("async function recoverPhotoshootFromGallery(")
    expect(concierge).toContain("gotServerVerdict = data !== null")
    expect(concierge).toContain('trackGenerationCompleted("photoshoot", "photoshoot_set_recovered")')
    expect(concierge).toContain('trackRecoveryShown("photoshoot", "lost_response")')
    // a real server verdict (content policy, refund already issued) still shows the real error
    expect(concierge).toContain('trackRecoveryShown("photoshoot", "exception")')
    // honest no-uncertainty copy: her credits come back on their own
    expect(concierge).toContain("come back on their own")
  })
})
