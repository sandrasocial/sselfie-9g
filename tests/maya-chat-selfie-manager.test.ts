// @vitest-environment node
// Locks the 2026-07-06 live-QA fixes from Sandra's hands-on testing:
// 1. Every selfie affordance inside Maya CHAT opens the full SelfieReferenceManagerModal
//    (manage selfies + angle/side/body/inspiration), never a raw file picker or the old
//    single-grid ReferenceLibraryModal.
// 2. Re-tapping the SAME format chip mid-thread re-arms the graphic-text gate and the
//    auto-pull (previously a silent no-op with stale textOverlayMode/textStyleChoice).

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const concierge = readFileSync(join(process.cwd(), "components/app-v3/maya-concierge.tsx"), "utf8")

describe("Maya chat selfie management", () => {
  it("uses the full reference manager modal in chat, not the retired single-grid picker", () => {
    expect(concierge).toContain(
      'import { SelfieReferenceManagerModal } from "./selfie-reference-manager-modal"'
    )
    expect(concierge).toContain("<SelfieReferenceManagerModal")
    expect(concierge).not.toContain("ReferenceLibraryModal")
  })

  it("selfie buttons open the manager modal instead of a raw file input", () => {
    // The hidden face file input must no longer be the click target of any selfie button.
    expect(concierge).not.toContain("onClick={() => fileInput.current?.click()}")
    expect(concierge).toContain("setSelfieManagerOpen(true)")
  })

  it("commits the picked selfie in-thread and never restarts the session", () => {
    // onContinue must patch the running session (setReferenceSelfieUrl), not call
    // openWithAesthetic — that is the front door's new-session path.
    const mount = concierge.slice(concierge.indexOf("<SelfieReferenceManagerModal"))
    const mountBlock = mount.slice(0, mount.indexOf("/>"))
    expect(mountBlock).toContain("setReferenceSelfieUrl")
    expect(mountBlock).not.toContain("openWithAesthetic")
  })

  it("consumes the one-shot setup action when the reference manager closes", () => {
    const context = readFileSync(
      join(process.cwd(), "components/app-v3/concierge-context.tsx"),
      "utf8"
    )
    const mount = concierge.slice(concierge.indexOf("<SelfieReferenceManagerModal"))
    const mountBlock = mount.slice(0, mount.indexOf("/>"))

    expect(context).toContain('Object.prototype.hasOwnProperty.call(opts, "initialSetupAction")')
    expect(mountBlock).toContain("onClose={closeSelfieManager}")
    expect(mountBlock).toContain("closeSelfieManager()")
  })

  it("retires the one-shot setup action as soon as the manager opens", () => {
    const effectStart = concierge.indexOf("// When a new look (or a Content idea) opens Maya")
    const effectEnd = concierge.indexOf("// Mirror of the active selfie", effectStart)
    const setupEffect = concierge.slice(effectStart, effectEnd)

    expect(setupEffect).toContain("updateCurrentSession(session.aesthetic, {")
    expect(setupEffect).toContain("initialSetupAction: null")
  })
})

describe("mid-thread format chip re-tap", () => {
  it("handlePickFormat always re-arms the text gate (no same-format guard)", () => {
    const fn = concierge.slice(
      concierge.indexOf("function handlePickFormat"),
      concierge.indexOf("function intentForCurrentVibeChoice")
    )
    expect(fn).not.toContain("if (id !== outputFormat)")
    expect(fn).toContain("setTextOverlayMode(null)")
    expect(fn).toContain("setTextStyleChoice(null)")
    expect(fn).toContain("lastPulledFormatRef.current = null")
  })

  it("Maya-driven set_format also re-arms the auto-pull ref", () => {
    // Typing "make me a carousel" mid-thread must behave like tapping the chip: without
    // nulling lastPulledFormatRef, a format pulled earlier in the thread never re-pulls
    // and the inline text-choice cards never re-appear.
    const start = concierge.indexOf("Conversational format switching")
    const effect = concierge.slice(start, concierge.indexOf("}, [messages", start))
    expect(effect).toContain("lastPulledFormatRef.current = null")
  })

  it("automatically continues when Maya redundantly switches to the format already selected", () => {
    const start = concierge.indexOf("Conversational format switching")
    const effect = concierge.slice(start, concierge.indexOf("}, [messages", start))

    expect(effect).toContain("shouldContinueCompletedFormatSwitch")
    expect(effect).toContain('sendMessage({ text: "Continue with what we already created." })')
  })
})

describe("gallery labels trust the stored format", () => {
  it("inferGalleryContentType reads real format categories before keyword sniffing", () => {
    const galleryAssets = readFileSync(join(process.cwd(), "lib/app-v3/gallery-assets.ts"), "utf8")
    expect(galleryAssets).toContain('case "photoshoot":')
    expect(galleryAssets).toContain('case "story-sequence":')
    const generateRoute = readFileSync(
      join(process.cwd(), "app/api/app-v3/maya/generate/route.ts"),
      "utf8"
    )
    // The generate route persists the real format, not the legacy 'concept' bucket.
    expect(generateRoute).toContain("'openai', ${format}, NOW()")
    expect(generateRoute).not.toContain("'openai', 'concept', NOW()")
  })
})
