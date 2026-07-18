// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChatHistoryModal } from "@/components/app-v3/chat-history-modal"
import { ConciergeProvider, useConcierge } from "@/components/app-v3/concierge-context"
import { ImageLightbox } from "@/components/app-v3/image-lightbox"
import { MayaConcierge } from "@/components/app-v3/maya-concierge"
import { SelfieReferenceManagerModal } from "@/components/app-v3/selfie-reference-manager-modal"
import { initiateAssetDownload } from "@/lib/app-v3/download-asset"
import { recordSuiteDownloadForReview } from "@/lib/testimonials/review-capture-client"

const mocks = vi.hoisted(() => ({
  setMessages: vi.fn(),
}))

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={typeof alt === "string" ? alt : ""} {...props} />
  ),
}))

vi.mock("ai", () => ({
  DefaultChatTransport: class DefaultChatTransport {},
}))

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [],
    sendMessage: vi.fn(),
    status: "ready",
    error: null,
    setMessages: mocks.setMessages,
  }),
}))

vi.mock("@/components/app-v3/memory-modal", () => ({
  MemoryModal: () => null,
}))

vi.mock("@/components/app-v3/edit-mode", () => ({
  EditMode: () => null,
}))

vi.mock("@/lib/app-v3/download-asset", () => ({
  initiateAssetDownload: vi.fn(),
}))

vi.mock("@/lib/testimonials/review-capture-client", () => ({
  recordSuiteDownloadForReview: vi.fn(),
}))

const MAYA_GENERAL = {
  id: "maya-general",
  name: "SSELFIE",
  blurb: "Create with Maya",
  coverImage: "",
  thumbnails: [],
  shotCount: 0,
  intent: "Help the member create the right asset.",
}

function OpenMaya() {
  const { openWithAesthetic } = useConcierge()
  return (
    <button
      type="button"
      onClick={() =>
        openWithAesthetic(MAYA_GENERAL, {
          referenceSelfieUrl: "https://example.com/member-selfie.jpg",
        })
      }
    >
      Open Maya
    </button>
  )
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function installBrowserStubs() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0),
  })
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    value: (id: number) => window.clearTimeout(id),
  })
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  })
}

describe("Stabilization A Creative Tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installBrowserStubs()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith("/maya/chats")) {
          return jsonResponse({
            chats: [
              {
                id: "past-task",
                title: "Past task",
                updatedAt: "2026-07-17T12:00:00.000Z",
                taskStatus: "ready",
                outputCount: 1,
              },
            ],
          })
        }
        if (url.endsWith("/maya/chats/past-task")) {
          return jsonResponse({
            messages: [
              {
                id: "past-message",
                role: "user",
                parts: [{ type: "text", text: "Create my saved launch photo" }],
              },
            ],
            workspace: {
              session: {
                aesthetic: MAYA_GENERAL,
                outputFormat: "photo",
                referenceSelfieUrl: "https://example.com/member-selfie.jpg",
                videoSourceUrl: null,
                inspirationImageUrl: null,
                creationIntent: null,
                shotDirector: null,
                generationSource: "selfie",
                creationIdea: null,
                startedAt: 123,
              },
              genState: {},
              generatedOnce: true,
              lastGeneration: null,
              textOverlayMode: null,
              textStyleChoice: null,
              textStyleAdjustments: null,
              generationSource: "selfie",
              valueUsed: false,
              setupOpen: false,
            },
          })
        }
        if (url.endsWith("/reference-library")) {
          return jsonResponse({
            images: ["https://example.com/member-selfie.jpg"],
            extras: {},
          })
        }
        if (url.endsWith("/aesthetics")) return jsonResponse({ aesthetics: [] })
        if (url.endsWith("/memory")) return jsonResponse({ hasBrandProfile: true })
        if (url.endsWith("/account")) return jsonResponse({ credits: 60 })
        return jsonResponse({})
      })
    )
  })

  it("reopens a past Creative Task and restores its conversation", async () => {
    render(
      <ConciergeProvider suppressRestore>
        <OpenMaya />
        <MayaConcierge />
      </ConciergeProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Open Maya" }))
    fireEvent.click(await screen.findByRole("button", { name: "Menu" }))
    fireEvent.click(screen.getByRole("button", { name: "History" }))
    const history = await screen.findByRole("dialog", { name: /Creative tasks/i })
    fireEvent.click(within(history).getByRole("button", { name: /^Plan Past task/ }))

    await waitFor(() =>
      expect(mocks.setMessages).toHaveBeenLastCalledWith([
        expect.objectContaining({ id: "past-message", role: "user" }),
      ])
    )
    expect(screen.queryByRole("dialog", { name: /Creative tasks/i })).not.toBeInTheDocument()
  })

  it("closes Creative Tasks without changing the current workspace", async () => {
    render(
      <ConciergeProvider suppressRestore>
        <OpenMaya />
        <MayaConcierge />
      </ConciergeProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Open Maya" }))
    fireEvent.click(await screen.findByRole("button", { name: "Menu" }))
    fireEvent.click(screen.getByRole("button", { name: "History" }))
    const history = await screen.findByRole("dialog", { name: /Creative tasks/i })
    fireEvent.click(within(history).getByRole("button", { name: "Close" }))

    expect(screen.queryByRole("dialog", { name: /Creative tasks/i })).not.toBeInTheDocument()
    expect(screen.getByRole("dialog", { name: /SSELFIE/i })).toBeInTheDocument()
  })

  it("keeps the Creative Tasks layer clickable inside Maya's pointer-safe shell", async () => {
    render(
      <ChatHistoryModal
        open
        currentChatId="current-task"
        onClose={vi.fn()}
        onSelect={vi.fn().mockResolvedValue(undefined)}
      />
    )

    const history = await screen.findByRole("dialog", { name: /Creative tasks/i })
    expect(history.parentElement).toHaveClass("pointer-events-auto")
  })

  it("requests a close after a saved task restores successfully", async () => {
    const onClose = vi.fn()
    const onSelect = vi.fn().mockResolvedValue(undefined)

    render(
      <ChatHistoryModal open currentChatId="current-task" onClose={onClose} onSelect={onSelect} />
    )

    const history = await screen.findByRole("dialog", { name: /Creative tasks/i })
    fireEvent.click(within(history).getByRole("button", { name: /^Plan Past task/ }))

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("past-task"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe("Stabilization A Change Selfie", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installBrowserStubs()
  })

  it("opens the native file chooser and applies a newly uploaded selfie", async () => {
    const onFaceReady = vi.fn()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith("/reference-library")) {
          return jsonResponse({ images: ["https://example.com/old-selfie.jpg"], extras: {} })
        }
        if (url.endsWith("/upload-selfie") && init?.method === "POST") {
          return jsonResponse({ url: "https://example.com/new-selfie.jpg" })
        }
        return jsonResponse({})
      })
    )

    const { container } = render(
      <SelfieReferenceManagerModal
        open
        initialFaceUrl="https://example.com/old-selfie.jpg"
        onClose={vi.fn()}
        onFaceReady={onFaceReady}
        onContinue={vi.fn()}
      />
    )

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(fileInput).not.toBeNull()
    const inputClick = vi.spyOn(fileInput as HTMLInputElement, "click")
    fireEvent.click(screen.getByRole("button", { name: "Change selfie" }))
    expect(inputClick).toHaveBeenCalledTimes(1)

    const file = new File(["selfie"], "selfie.jpg", { type: "image/jpeg" })
    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } })
    await waitFor(() =>
      expect(onFaceReady).toHaveBeenCalledWith("https://example.com/new-selfie.jpg", "upload")
    )
  })

  it("closes the selfie manager immediately", () => {
    const onClose = vi.fn()
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {}))
    )

    render(
      <SelfieReferenceManagerModal
        open
        initialFaceUrl="https://example.com/member-selfie.jpg"
        onClose={onClose}
        onContinue={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe("Stabilization A finished-result download", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installBrowserStubs()
  })

  it("records value only after the browser download starts", async () => {
    const onDownloaded = vi.fn()
    vi.mocked(initiateAssetDownload).mockResolvedValue(true)

    render(
      <ImageLightbox
        images={["https://example.com/photo.png"]}
        assetIds={[42]}
        formats={["photo"]}
        onDownloaded={onDownloaded}
        onClose={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Download" }))

    await waitFor(() => expect(onDownloaded).toHaveBeenCalledTimes(1))
    expect(recordSuiteDownloadForReview).toHaveBeenCalledWith({
      source: "lightbox",
      assetId: 42,
      format: "photo",
    })
  })

  it("keeps Maya's fullscreen result interactive and closes without activating Calendar behind it", () => {
    const onClose = vi.fn()
    const onOpenCalendar = vi.fn()

    render(
      <div className="pointer-events-none">
        <button type="button" onClick={onOpenCalendar}>
          Calendar
        </button>
        <ImageLightbox images={["https://example.com/photo.png"]} onClose={onClose} />
      </div>
    )

    const fullscreen = screen.getByRole("dialog", { name: "Your finished creation" })
    expect(fullscreen).toHaveClass("pointer-events-auto")

    fireEvent.click(within(fullscreen).getByRole("button", { name: "Close" }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onOpenCalendar).not.toHaveBeenCalled()
  })

  it("does not claim success when the browser download fails", async () => {
    const onDownloaded = vi.fn()
    vi.mocked(initiateAssetDownload).mockResolvedValue(false)

    render(
      <ImageLightbox
        images={["https://example.com/photo.png"]}
        assetIds={[42]}
        formats={["photo"]}
        onDownloaded={onDownloaded}
        onClose={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Download" }))
    await waitFor(() => expect(initiateAssetDownload).toHaveBeenCalledTimes(1))

    expect(onDownloaded).not.toHaveBeenCalled()
    expect(recordSuiteDownloadForReview).not.toHaveBeenCalled()
  })
})
