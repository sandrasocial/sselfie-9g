// @vitest-environment node

// MAYA-GUIDED-TEXT-02 (2026-07-20) - Sandra's live reports:
// 1. "Maya just says 'On it, switching to carousels' and then stops": a conversational
//    set_format left the stale session creationIntent in place, so the follow-up pull was
//    processed server-side as the OLD format, and for graphic formats the flow parked on
//    the text-choice gate with no continuation.
// 2. "Images show up without text": the generate function's auto-bake time budget
//    (AUTO_BAKE_TIME_BUDGET_MS) is structurally unreachable for multi-slide carousels
//    (hero + rest renders alone eat ~165s+), so with-text carousels always arrived clean
//    and waited for a manual "Try text again" tap per card.

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("conversational set_format continues instead of stalling (maya-concierge)", () => {
  const concierge = read("components/app-v3/maya-concierge.tsx")

  it("refreshes the creation intent so the pull runs as the switched format", () => {
    expect(concierge).toContain("The pull that follows must run AS the switched format")
    const start = concierge.indexOf("Conversational format switching")
    const effect = concierge.slice(start, concierge.indexOf("}, [\n    messages", start))
    expect(effect).toContain("setLocalCreationIntent(intent)")
    expect(effect).toContain("creationIntent: intent")
  })

  it("auto-continues with her remembered text style or the editorial default", () => {
    const start = concierge.indexOf("Conversational format switching")
    const effect = concierge.slice(start, concierge.indexOf("}, [\n    messages", start))
    expect(effect).toContain("rememberedOverlayStyle")
    expect(effect).toContain('setTextOverlayMode("with-text")')
    expect(effect).toContain("rememberedOverlayStyle ?? DEFAULT_GRAPHIC_OVERLAY_STYLE")
  })
})

describe("baked text completes client-side after generation (maya-concierge)", () => {
  const concierge = read("components/app-v3/maya-concierge.tsx")

  it("continues skipped auto-bakes on BOTH generation completion paths plus manual retry", () => {
    const calls = concierge.match(/bakeMissingTextSlides\(\{/g) || []
    // stream done + JSON done + the manual "Try text again" wrapper
    expect(calls.length).toBeGreaterThanOrEqual(3)
    const autoCalls = concierge.match(/stopOnError: false/g) || []
    expect(autoCalls.length).toBeGreaterThanOrEqual(2)
  })

  it("keeps manual retry semantics (first failure throws to the card)", () => {
    const retry = concierge.slice(concierge.indexOf("async function retryMissingBakedText"))
    expect(retry).toContain("bakeMissingTextSlides")
    expect(retry).toContain("stopOnError: true")
  })

  it("runs one continuation per result card and caps bake concurrency", () => {
    expect(concierge).toContain("bakeContinuationKeysRef")
    expect(concierge).toContain("Math.min(2, queue.length)")
  })

  it("always bakes from the clean base, never a previous baked result", () => {
    const core = concierge.slice(concierge.indexOf("async function bakeMissingTextSlides"))
    expect(core).toContain("cleanImageUrl: cleanImages[index]")
    expect(core).not.toContain("bakedUrl ??")
  })
})
