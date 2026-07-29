// @vitest-environment node

// Guards for Sandra's 2026-07-06 live QA round #2:
// 1. "Start new" must never resurrect the previous thread (save-race + draft re-seed).
// 2. An uploaded inspiration image is never silently ignored - style-led sessions use it
//    as a pose/light/mood accent, inspiration-led sessions reconstruct it.
// 3. The memory modal shows what Maya actually learns (not just blank fields).
// 4. Anti-copy-paste realism: identity refs restyle for the brief in every person pipeline.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { SSELFIE_SELFIE_RESTYLE } from "@/lib/app-v3/maya/visual-rules"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("start-new chat integrity", () => {
  it("seeds the local draft once per mount, never re-seeding after a session reset", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(concierge).toContain("draftSeededRef")
    expect(concierge).toContain("!draftSeededRef.current && session?.startedAt")
    // The old always-re-seed condition must not come back.
    expect(concierge).not.toContain("if (restoredDraftRef.current === null && session?.startedAt) {")
  })

  it("never saves a stale thread under a new session key (the save-race that resurrected old chats)", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(concierge).toContain("sessionChatIdRef")
    expect(concierge).toContain("sessionChatIdRef.current !== chatId) return")
    // Every chat re-key keeps the ref in sync: reset, restore, new-chat button, history select.
    expect(concierge.match(/sessionChatIdRef\.current = /g)?.length).toBeGreaterThanOrEqual(4)
  })

  it("every explicit session action outranks any in-flight server-draft restore", () => {
    const context = read("components/app-v3/concierge-context.tsx")
    const openFreshStart = context.indexOf("const openFresh")
    const openFreshBody = context.slice(openFreshStart, context.indexOf("}, [])", openFreshStart))
    // 2026-07-29 (UX audit B1): a late-resolving mount GET replaced an ACTIVE mid-stream
    // session and its just-sent messages were lost. Every user-initiated open/restore path
    // now claims authority, and the restore discards its result once any exists.
    expect(openFreshBody).toContain("claimSessionAuthority()")
    expect(context).toContain("const claimSessionAuthority = useCallback(() => {")
    expect(context).toContain("explicitSessionRef.current = true")
    expect(context).toContain("if (explicitSessionRef.current) return")
    // Every explicit session entry point claims authority (openFresh + 8 more).
    expect(context.match(/claimSessionAuthority\(\)/g)?.length).toBeGreaterThanOrEqual(9)
  })
})

describe("inspiration image is honored, mode-aware", () => {
  it("style-led sessions get the accent mode; inspiration-led sessions reconstruct", () => {
    const route = read("app/api/app-v3/maya/generate/route.ts")
    expect(route).toContain("SSELFIE_INSPIRATION_STYLE_ACCENT")
    expect(route).toContain("styleLedSession")
    expect(route).toContain('!body.aestheticId.startsWith("maya-")')
    expect(route).toContain("leadInspirationMode")
    // The old forced close-recreation on every single-photo job is gone.
    expect(route).not.toContain('withInspirationReferenceInstruction(job, "close-recreation")')
  })

  it("a rejected inspiration URL is logged, never dropped silently", () => {
    const route = read("app/api/app-v3/maya/generate/route.ts")
    expect(route).toContain("inspiration image rejected by reference allowlist")
  })

  it("the member can SEE her inspiration is in play", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(concierge).toContain('" · Inspiration in"')
    expect(concierge).toContain("Your inspiration image is in.")
  })
})

describe("memory modal shows real knowledge", () => {
  it("surfaces the learned overlay style with a one-tap forget", () => {
    const modal = read("components/app-v3/memory-modal.tsx")
    expect(modal).toContain("preferredOverlayStyle")
    expect(modal).toContain("Your usual text style")
    expect(modal).toContain("clearOverlayStyle")
    expect(modal).toContain("What I know about you")
  })
})

describe("anti-copy-paste realism (both directions)", () => {
  it("the shared restyle rule forbids lifting the selfie's outfit/pose/background", () => {
    expect(SSELFIE_SELFIE_RESTYLE).toContain("never what she wears or where she stands")
    expect(SSELFIE_SELFIE_RESTYLE).toContain("Do not copy the identity photos' clothing")
    expect(SSELFIE_SELFIE_RESTYLE).toContain("the same woman")
  })

  it("every person-into-scene pipeline carries BOTH integration and restyle rules", () => {
    const compiler = read("lib/app-v3/prompt-compiler.ts")
    const shoot = read("lib/content-kit/shoot-generator.ts")
    for (const source of [compiler, shoot]) {
      expect(source).toContain("SSELFIE_ENVIRONMENT_INTEGRATION")
      expect(source).toContain("SSELFIE_SELFIE_RESTYLE")
    }
  })
})

describe("QA open-list build (2026-07-06)", () => {
  it("the credit balance is visible in the Maya drawer and stays fresh after renders", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(concierge).toContain("creditBalance")
    expect(concierge).toContain('fetch("/api/app-v3/account")')
    expect(concierge).toContain("credits`")
    // Every generation response refreshes it via the shared depletion handler.
    expect(concierge).toContain("if (typeof balance === \"number\") setCreditBalance(balance)")
  })

  it("Continue history opens the real chat list, not just the in-memory drawer", () => {
    const context = read("components/app-v3/concierge-context.tsx")
    const launcher = read("components/app-v3/maya-floating-launcher.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(context).toContain("openHistory")
    expect(context).toContain("historyRequestId")
    expect(launcher).not.toContain("openHistory()")
    expect(launcher).toContain("Saved sessions resume directly")
    expect(concierge).toContain("lastHistoryRequestRef")
    expect(concierge).toContain("setHistoryOpen(true)")
    expect(concierge).toContain("New chat")
    expect(concierge).toContain("History")
  })

  it("Maya chooses one strongest look before planning anything", () => {
    const route = read("app/api/app-v3/maya/chat/route.ts")
    expect(route).toContain("MAYA CHOOSES THE LOOK")
    expect(route).toContain('body?.aestheticId === "maya-decides"')
    expect(route).toContain("Do not ask her to choose a style")
    const inline = read("components/app-v3/maya-inline-components.tsx")
    expect(inline).toContain("Not sure? Let Maya choose")
  })

  it("keeps legacy trained-model selection out of Maya Create", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(concierge).not.toContain("Your trained model from Studio came with you.")
    expect(concierge).not.toContain("Photo source")
  })

  it("without a selfie the selfie action is the ONLY thing on Create; with one, the typed start leads", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    // AUDIT-01 fix (2026-07-09): no more split screen for someone without a selfie - the
    // typed start / chips column must not render at all until she has one saved.
    expect(frontDoor).toContain("if (!hasSelfie)")
    expect(frontDoor).toContain("Maya recommends ·")
    expect(frontDoor).toContain("Tell Maya what you need")
  })
})

describe("activation clarity (first-session audit quick wins)", () => {
  it("the first-photo CTA says what it is and what it costs", () => {
    const card = read("components/app-v3/concept-card.tsx")
    expect(card).toContain("Create my photo · 1 credit")
    expect(card).not.toContain("Start my brand shoot")
  })

  it("the reference manager has ONE way forward", () => {
    const modal = read("components/app-v3/selfie-reference-manager-modal.tsx")
    expect(modal).toContain("Continue with Maya")
    expect(modal).not.toMatch(/>\s*Done\s*</)
  })

  it("the trust line sits at the upload button", () => {
    const inline = read("components/app-v3/maya-inline-components.tsx")
    expect(inline).toContain("Your selfie stays yours.")
  })
})
