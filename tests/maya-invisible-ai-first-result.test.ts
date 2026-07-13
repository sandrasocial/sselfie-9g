import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("Maya Invisible AI: first result and return integrity", () => {
  it("keeps topic and style clarification replies from changing the committed format", () => {
    const types = read("lib/app-v3/maya/concept-types.ts")
    const route = read("app/api/app-v3/maya/chat/route.ts")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(types).toContain('kind?: "format" | "detail"')
    expect(route).toMatch(/\.enum\(\[\s*"format",\s*"detail"\s*\]\)/)
    expect(route).toContain('kind: \\"format\\"')
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
    expect(frontDoor).toContain("Maya recommends today")
    expect(frontDoor).toContain("Continue with Maya")
    expect(frontDoor).toContain("<details")
    expect(frontDoor).toContain("More ways to create")
    expect(frontDoor).not.toContain("helps you choose the format, style")
    expect(frontDoor).not.toContain("title={CARD_COPY.title}")
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
    expect(concierge).toContain("conceptPart.slice(1)")
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
    expect(body).toContain(
      "lastPulledFormatRef.current = needsGraphicTextChoice ? null : nextFormat"
    )
  })

  it("resumes the exact active draft and labels transcript history honestly", () => {
    const launcher = read("components/app-v3/maya-floating-launcher.tsx")
    const context = read("components/app-v3/concierge-context.tsx")
    const history = read("components/app-v3/chat-history-modal.tsx")
    const localDraft = read("components/app-v3/continuity.ts")
    const serverDraft = read("lib/app-v3/maya/draft-snapshot.ts")

    expect(launcher).toContain("Resume current")
    expect(launcher).toContain("Start new")
    expect(launcher).toContain("View past chats")
    expect(launcher).toContain("open()")
    expect(context).toContain("const open = useCallback")
    expect(history).toContain("Finished files stay in Photos")

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
    expect(launcher).toContain("workspaceBusy")
    expect(launcher).toContain("Maya is finishing your creation")
    expect(launcher).toContain("disabled={workspaceBusy}")
  })

  it("keeps a requested history view queued until the active work finishes", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
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
