// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { sanitizeMayaMessages } from "@/lib/app-v3/maya/message-sanitizer"

const read = (path: string) => readFileSync(path, "utf8")

describe("Maya chat trust pass", () => {
  it("keeps Calendar history only for an explicit Calendar conversation", () => {
    const messages = [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          { type: "tool-show_feed_plan", output: { days: [{ date: "2026-07-17" }] } },
          { type: "tool-save_brand_profile", output: { saved: true } },
        ],
      },
    ]

    expect(sanitizeMayaMessages(messages)).toEqual([
      {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "tool-save_brand_profile", output: { saved: true } }],
      },
    ])
    expect(sanitizeMayaMessages(messages, { calendar: true })).toEqual(messages)
  })

  it("does not turn persistence outages into destructive empty states", () => {
    const memoryRoute = read("app/api/app-v3/maya/memory/route.ts")
    const chatsRoute = read("app/api/app-v3/maya/chats/route.ts")
    const draftRoute = read("app/api/app-v3/maya/draft/route.ts")
    const referenceRoute = read("app/api/app-v3/reference-library/route.ts")
    const memoryModal = read("components/app-v3/memory-modal.tsx")

    expect(memoryRoute).toContain(
      'return NextResponse.json({ error: "Could not load memory" }, { status: 500 })'
    )
    expect(chatsRoute).toContain(
      'return NextResponse.json({ error: "Could not load chats" }, { status: 500 })'
    )
    expect(draftRoute).toContain(
      'return NextResponse.json({ error: "Could not load draft" }, { status: 500 })'
    )
    expect(referenceRoute).toContain(
      'return NextResponse.json({ error: "Could not load selfies" }, { status: 500 })'
    )
    expect(memoryModal).toContain("loadedSuccessfully")
    expect(memoryModal).toContain("Retry")
    expect(memoryModal).toContain("disabled={saving || loading || !loadedSuccessfully}")
  })

  it("rejects stale draft and chat writes", () => {
    const draftStore = read("lib/app-v3/maya/draft-store.ts")
    const chatStore = read("lib/app-v3/maya/chat-store.ts")
    const chatsRoute = read("app/api/app-v3/maya/chats/route.ts")

    expect(draftStore).toContain("EXCLUDED.snapshot ->> 'savedAt'")
    expect(draftStore).toContain("app_v3_maya_drafts.snapshot ->> 'savedAt'")
    expect(chatStore).toContain("client_saved_at")
    expect(chatStore).toContain("EXCLUDED.client_saved_at >= app_v3_chats.client_saved_at")
    expect(chatsRoute).toContain("savedAt")
  })

  it("does not save the visible conversation under a newly selected history id", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("suppressChatSaveForIdRef")
    expect(concierge).toContain("suppressChatSaveForIdRef.current = id")
    expect(concierge).toContain("if (suppressChatSaveForIdRef.current === chatId)")
    expect(concierge).not.toContain("id: chatId,\n    messages:")
  })

  it("continues recommended graphic actions with the compact default finish", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain('setTextOverlayMode("with-text")')
    expect(concierge).toContain("rememberedOverlayStyle ?? DEFAULT_GRAPHIC_OVERLAY_STYLE")
    expect(concierge).not.toContain("const autoTextStyle =")
  })

  it("binds edits to the active workspace and replaces the edited image in place", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const editMode = read("components/app-v3/edit-mode.tsx")

    expect(concierge).toContain("const [editBusy, setEditBusy] = useState(false)")
    expect(concierge).toContain("editBusy ||")
    expect(editMode).toContain("onBusyChange?: (busy: boolean) => void")
    expect(editMode).toContain("disabled={busy}")
    expect(concierge).toContain("nextUrls[0] = newUrl")
    expect(concierge).not.toContain("imageUrls: [newUrl, ...prevUrls]")
  })

  it("rolls text state back when a paid refinement fails", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("const previousTextState")
    expect(concierge).toContain("restoreTextRefinementState")
  })

  it("labels multi-image credit spend and exposes errors to assistive technology", () => {
    const card = read("components/app-v3/concept-card.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(card).toContain("estimatedCredits")
    expect(card).toContain('estimatedCredits === 1 ? "credit" : "credits"')
    expect(card).toContain('role="alert"')
    // MAYA-MULTISLIDE-ACCESS-02: the photoshoot-set grid is now per-thumbnail (a tap opens
    // that exact shot), so each thumbnail carries its own precise label instead of one
    // generic label for the whole grid.
    expect(concierge).toContain(
      "aria-label={`View shot ${index + 1} of ${urls.length} full screen`}"
    )
  })

  it("reconciles a paid single-image request when the stream disappears", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).toContain("recoverSingleImageFromGallery")
    expect(concierge).toContain("clientRequestId: generationRequestId")
    expect(concierge).toContain('restorePaidSingleImage("stream_recovered"')
  })
})
