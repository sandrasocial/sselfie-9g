import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("Maya Invisible AI: first result and return integrity", () => {
  it("takes the first selfie directly into one Maya-chosen photo path", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const start = frontDoor.indexOf("function openSelfieManagerInMaya")
    const end = frontDoor.indexOf("\n  return (", start)
    const firstSelfiePath = frontDoor.slice(start, end)

    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(firstSelfiePath).toContain("openWithAesthetic(MAYA_DECIDES_AESTHETIC")
    expect(firstSelfiePath).toContain('format: "photo"')
    expect(firstSelfiePath).toContain('initialSetupAction: "selfie_manager"')
    expect(firstSelfiePath).toContain(
      'creationIdea: "Create one strong brand photo I can use today."'
    )
    expect(firstSelfiePath).not.toContain("MAYA_BLANK")

    expect(concierge).toContain("const guidedFirstPhoto =")
    expect(concierge).toContain("if (selfieManagerOpen) return")
    expect(concierge).toContain("{guidedFirstPhoto && (")
    expect(concierge).toContain("Maya is choosing one strong direction")
    expect(concierge).toContain('guidedFirstPhoto ? "hidden" : ""')
    expect(concierge).toContain("const workspaceTitle = generalHomeConversation")
    expect(concierge).toContain('"What do you need today?"')
    expect(concierge).toContain('? "Learn with Maya"')
    expect(concierge).toContain('? "Create with Maya"')
    expect(concierge).toContain("{workspaceTitle}")
  })

  it("does not silently carry an old inspiration image into a fresh first photo", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const selfieManager = read("components/app-v3/selfie-reference-manager-modal.tsx")
    const start = concierge.indexOf("// Identity persistence")
    const end = concierge.indexOf("const retryAesthetics", start)
    const referenceRestore = concierge.slice(start, end)

    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(referenceRestore).toContain("d?.extras?.threeQuarter")
    expect(referenceRestore).toContain("d?.extras?.sideProfile")
    expect(referenceRestore).toContain("d?.extras?.fullBody")
    // 2026-07-15 hardening: inspiration restores ONLY into a session resumed with existing
    // messages - NO fresh creation inherits an old inspiration image, whatever the entry
    // point (typed text, chips, recommendation, weekly look). The old guided-first-photo
    // carve-out is gone because the broader rule covers it.
    expect(referenceRestore).toContain("if (sessionResumedWithHistoryRef.current)")
    expect(referenceRestore).not.toContain("isGuidedFirstPhotoSession")
    expect(referenceRestore).toContain("d?.extras?.inspiration")
    const concierge2 = concierge
    expect(concierge2).toContain("sessionResumedWithHistoryRef.current = draft.messages.length > 0")
    expect(concierge2).toContain("sessionResumedWithHistoryRef.current = loaded.length > 0")
    expect(concierge).toContain("closeSelfieManager()\n          setSetupOpen(false)")
    expect(concierge).toContain("hideOptionalReferences={guidedFirstPhoto}")
    expect(selfieManager).toContain("hideOptionalReferences = false")
    expect(selfieManager).toContain("{!hideOptionalReferences && (")
  })

  it("keeps topic and style clarification replies from changing the committed format", () => {
    const types = read("lib/app-v3/maya/concept-types.ts")
    const route = read("app/api/app-v3/maya/chat/route.ts")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(types).toContain('kind?: "format" | "detail"')
    expect(route).toMatch(/\.enum\(\[\s*"format",\s*"detail"\s*\]\)/)
    expect(route).toContain("Use format only when no output format is committed")
    expect(concierge).toContain("function sendInlineAnswer(answer: string, kind:")
    expect(concierge).toContain('if (kind === "format")')
    expect(concierge).toContain("preserveCommittedFormat")
    expect(concierge).toContain("onPick={answer => sendInlineAnswer(answer, clarifyPart.kind)}")
  })

  it("lets Maya choose the visual direction without forcing a style question", () => {
    const aesthetics = read("components/app-v3/aesthetics.ts")
    const route = read("app/api/app-v3/maya/chat/route.ts")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(aesthetics).toContain("export const MAYA_DECIDES_AESTHETIC")
    expect(route).toContain("## MAYA CHOOSES THE LOOK")
    expect(route).toContain("Do not ask her to choose a style")
    expect(route).not.toContain("## MAYA SUGGESTS LOOKS")
    expect(concierge).toContain('session.aesthetic.id === "maya-decides"')
  })

  it("shows one personalized recommendation and hides advanced starts by default", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")

    expect(frontDoor).toContain('fetch("/api/app-v3/maya/recommendations")')
    expect(frontDoor).toContain("recommendations[0]")
    expect(frontDoor).toContain("Maya recommends ·")
    expect(frontDoor).toContain("Create this with Maya")
    expect(frontDoor).toContain("alternateWorlds")
    expect(frontDoor).toContain("Recreate this look")
    expect(frontDoor).not.toContain("helps you choose the format, style")
    expect(frontDoor).not.toContain("title={CARD_COPY.title}")
  })

  it("refreshes the recommendation after the member teaches Maya about her brand", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")

    expect(frontDoor).toContain("onSaved={() => setRecommendationReload(current => current + 1)}")
  })

  it("uses bundled looks as a failure-safe and exposes a retry", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("useState<Aesthetic[]>(AESTHETICS)")
    expect(concierge).toContain("retryAesthetics")
    expect(concierge).toContain("Using the looks already saved in SUITE")
  })

  it("removes naming from the pre-value flow and keeps it in Memory", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const memory = read("components/app-v3/memory-modal.tsx")

    expect(concierge).not.toContain("what would you like to call me")
    expect(concierge).not.toContain("showNaming")
    expect(memory).toContain("Her name")
  })

  it("shows one recommended concept and discloses alternatives", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const card = read("components/app-v3/concept-card.tsx")

    expect(card).toContain('eyebrow = "Maya\'s idea"')
    expect(concierge).toContain('eyebrow={recommended ? "Maya recommends" : "Another direction"}')
    expect(concierge).toContain("See more ideas")
    expect(concierge).toMatch(/conceptPart\s*\.slice\(1\)/)
  })

  it("makes download real and moves result extras behind More", () => {
    const helper = read("lib/app-v3/download-asset.ts")
    const card = read("components/app-v3/concept-card.tsx")
    const gallery = read("components/app-v3/gallery-view.tsx")
    const lightbox = read("components/app-v3/image-lightbox.tsx")
    const resultActions = read("components/app-v3/maya-inline-components.tsx")

    expect(helper).toContain("initiateAssetDownload")
    expect(helper).toContain("anchor.download")
    expect(helper).toContain('url.searchParams.set("download", "1")')
    expect(helper).not.toContain('anchor.target = "_blank"')
    expect(card).toContain("onDownloaded?.()")
    expect(card).toContain("More")
    expect(card).not.toContain("window.open(firstBaked ?? images[0]")
    expect(lightbox).not.toContain("window.open(baked ?? url")
    const galleryDownloadBody = gallery.slice(
      gallery.indexOf("async function downloadAsset"),
      gallery.indexOf("function assetLabel")
    )
    expect(galleryDownloadBody).toContain("await initiateAssetDownload")
    expect(galleryDownloadBody.indexOf("await initiateAssetDownload")).toBeLessThan(
      galleryDownloadBody.indexOf("recordSuiteDownloadForReview")
    )
    expect(resultActions).toContain("Maya recommends next")
    expect(resultActions).toContain("More things Maya can make")
    expect(resultActions).toContain('"next_action", "recommended"')
    expect(resultActions).toContain('"next_action", "more"')
  })

  it("measures whether members follow Maya's recommendation or choose an alternative", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain('selection: "recommended" | "more"')
    expect(concierge).toContain("from_format: format")
    expect(concierge).toContain("to_format: nextFormat")
  })

  it("re-enters the graphic text gate for a next-format action", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const start = concierge.indexOf("function handleNextFormat")
    const end = concierge.indexOf("function trackGenerationCompleted")
    const body = concierge.slice(start, end)

    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(body).toContain("isGraphicOutputFormat(nextFormat)")
    // 2026-07-29 (UX audit): graphic next-steps must never end in silence. A remembered
    // text style continues hands-free (style still swappable before credits are spent);
    // first-timers re-enter the explicit text gate, scrolled into view.
    expect(body).toContain("if (rememberedOverlayStyle) {")
    expect(body).toContain('setTextOverlayMode("with-text")')
    expect(body).toContain("setTextStyleChoice(rememberedOverlayStyle)")
    expect(body).toContain("lastPulledFormatRef.current = null")
    expect(body).toContain("requestAnimationFrame(() => scrollThreadToBottom())")
  })

  it("resumes the exact active draft and labels transcript history honestly", () => {
    const launcher = read("components/app-v3/maya-floating-launcher.tsx")
    const context = read("components/app-v3/concierge-context.tsx")
    const history = read("components/app-v3/chat-history-modal.tsx")
    const localDraft = read("components/app-v3/continuity.ts")
    const serverDraft = read("lib/app-v3/maya/draft-snapshot.ts")

    expect(launcher).toContain("operatingLayerEnabled || hasSavedSession")
    expect(launcher).toContain("open()")
    expect(launcher).toContain("openFresh()")
    expect(launcher).not.toContain("Resume current")
    expect(launcher).not.toContain("Start new")
    expect(launcher).not.toContain("View past chats")
    expect(context).toContain("const open = useCallback")
    expect(history).toContain("direction cards, and finished versions")
    expect(history).toContain("Creative tasks")

    for (const source of [localDraft, serverDraft]) {
      expect(source).toContain("lastGeneration")
      expect(source).toContain("textOverlayMode")
      expect(source).toContain("textStyleChoice")
      expect(source).toContain("generationSource")
      expect(source).toContain("valueUsed")
    }
  })

  it("does not let an in-flight render land in another Maya workspace", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const context = read("components/app-v3/concierge-context.tsx")
    const launcher = read("components/app-v3/maya-floating-launcher.tsx")

    expect(concierge).toContain("const workspaceBusy =")
    expect(concierge).toContain('state.status === "generating"')
    expect(concierge).toContain("if (workspaceBusy) return")
    expect(concierge).toContain("disabled={workspaceBusy}")
    expect(concierge).toContain("setWorkspaceBusy(workspaceBusy)")
    expect(context).toContain("if (workspaceBusy)")
    expect(context).toContain("setIsOpen(true)")
    expect(launcher).not.toContain("workspaceBusy")
    expect(launcher).toContain("operatingLayerEnabled || hasSavedSession")
  })

  it("keeps a requested history view queued until the active work finishes", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(concierge).toContain("useRef(historyRequestId)")
    const requestIndex = concierge.indexOf("historyRequestId === 0")
    const busyIndex = concierge.indexOf("if (workspaceBusy) return", requestIndex)
    const consumedIndex = concierge.indexOf(
      "lastHistoryRequestRef.current = historyRequestId",
      requestIndex
    )

    expect(requestIndex).toBeGreaterThan(-1)
    expect(busyIndex).toBeGreaterThan(requestIndex)
    expect(consumedIndex).toBeGreaterThan(busyIndex)
  })
})
