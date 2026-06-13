import { describe, expect, it } from "vitest"
import {
  buildStoredSectionHref,
  coerceStoredAppSection,
  sanitizeConciergeSnapshot,
  sanitizeMayaDraftForSession,
} from "@/components/app-v3/continuity"

describe("App v3 refresh continuity", () => {
  it("keeps the last valid app section and maps it to a refresh-safe URL", () => {
    expect(coerceStoredAppSection("photos", "create")).toBe("photos")
    expect(coerceStoredAppSection("content", "create")).toBe("content")
    expect(coerceStoredAppSection("maya", "photos")).toBe("photos")

    expect(buildStoredSectionHref("create")).toBe("/app")
    expect(buildStoredSectionHref("library")).toBe("/app?view=library")
  })

  it("restores only a valid open Maya concierge session", () => {
    const snapshot = sanitizeConciergeSnapshot({
      isOpen: true,
      savedAt: Date.now(),
      session: {
        aesthetic: {
          id: "quiet-luxury",
          name: "Quiet Luxury",
          blurb: "Soft city light.",
          coverImage: "",
          thumbnails: [],
          shotCount: 6,
          intent: "Editorial city shoot.",
        },
        outputFormat: "photo",
        referenceSelfieUrl: "https://example.com/selfie.png",
        graphicText: null,
        seedPrompt: null,
        startedAt: 123,
      },
    })

    expect(snapshot?.isOpen).toBe(true)
    expect(snapshot?.session?.aesthetic.name).toBe("Quiet Luxury")
    expect(
      sanitizeConciergeSnapshot({ isOpen: true, session: null, savedAt: Date.now() })
    ).toBeNull()
    expect(
      sanitizeConciergeSnapshot({ isOpen: true, session: { aesthetic: {} }, savedAt: Date.now() })
    ).toBeNull()
  })

  it("restores generated concept card images only for the active session", () => {
    const draft = {
      chatId: "chat_123",
      sessionStartedAt: 123,
      savedAt: Date.now(),
      generatedOnce: true,
      setupOpen: false,
      messages: [{ id: "m1", role: "assistant", parts: [{ type: "text", text: "Pick one." }] }],
      genState: {
        "m1:concept-1": {
          status: "done",
          imageUrls: ["https://blob.vercel-storage.com/final.png"],
        },
      },
    }

    expect(sanitizeMayaDraftForSession(draft, 123)?.genState["m1:concept-1"]?.status).toBe("done")
    expect(sanitizeMayaDraftForSession(draft, 999)).toBeNull()
    expect(sanitizeMayaDraftForSession({ ...draft, chatId: "" }, 123)).toBeNull()
  })
})
