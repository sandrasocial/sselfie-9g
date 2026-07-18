// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConciergeProvider, useConcierge } from "@/components/app-v3/concierge-context"
import { MayaConcierge } from "@/components/app-v3/maya-concierge"

const MAYA_GENERAL = {
  id: "maya-general",
  name: "SSELFIE",
  blurb: "Create with Maya",
  coverImage: "",
  thumbnails: [],
  shotCount: 0,
  intent: "Help the member create the right asset.",
}

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

vi.mock("@/components/app-v3/selfie-reference-manager-modal", () => ({
  SelfieReferenceManagerModal: ({
    open,
    initialFocus,
  }: {
    open: boolean
    initialFocus?: "face" | "inspiration"
  }) =>
    open ? (
      <div role="dialog" aria-label="Reference manager" data-initial-focus={initialFocus} />
    ) : null,
}))

vi.mock("@/components/app-v3/chat-history-modal", () => ({
  ChatHistoryModal: () => null,
}))

vi.mock("@/components/app-v3/memory-modal", () => ({
  MemoryModal: () => null,
}))

vi.mock("@/components/app-v3/image-lightbox", () => ({
  ImageLightbox: () => null,
}))

vi.mock("@/components/app-v3/edit-mode", () => ({
  EditMode: () => null,
}))

function OpenMaya({ action }: { action: "inspiration_manager" | "selfie_manager" }) {
  const { openWithAesthetic } = useConcierge()
  return (
    <button
      type="button"
      onClick={() =>
        openWithAesthetic(MAYA_GENERAL, {
          referenceSelfieUrl: "https://example.com/member-selfie.jpg",
          initialSetupAction: action,
        })
      }
    >
      Open Maya
    </button>
  )
}

function renderMaya(action: "inspiration_manager" | "selfie_manager") {
  return render(
    <ConciergeProvider suppressRestore>
      <OpenMaya action={action} />
      <MayaConcierge />
    </ConciergeProvider>
  )
}

describe("Stabilization A Maya shell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith("/reference-library")) {
          return new Response(
            JSON.stringify({
              images: ["https://example.com/member-selfie.jpg"],
              extras: {},
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        }
        if (url.endsWith("/aesthetics")) {
          return new Response(JSON.stringify({ aesthetics: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        }
        if (url.endsWith("/memory")) {
          return new Response(JSON.stringify({ hasBrandProfile: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        }
        if (url.endsWith("/account")) {
          return new Response(JSON.stringify({ credits: 60 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        }
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      })
    )
  })

  it("keeps the Inspiration launch focused on inspiration after retiring the one-shot action", async () => {
    renderMaya("inspiration_manager")
    fireEvent.click(screen.getByRole("button", { name: "Open Maya" }))

    const manager = await screen.findByRole("dialog", { name: "Reference manager" })
    expect(manager).toHaveAttribute("data-initial-focus", "inspiration")
  })

  it("opens Maya as a full mobile workspace by default", async () => {
    renderMaya("selfie_manager")
    fireEvent.click(screen.getByRole("button", { name: "Open Maya" }))

    const workspace = await screen.findByRole("dialog", { name: /SSELFIE/i })
    await waitFor(() => expect(workspace.className).toContain("h-[94dvh]"))
    expect(workspace.className).not.toContain("h-[62dvh]")
  })
})
