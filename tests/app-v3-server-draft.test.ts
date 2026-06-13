import { describe, expect, it } from "vitest"
import { sanitizeServerMayaDraftSnapshot } from "@/lib/app-v3/maya/draft-snapshot"

describe("App v3 server-backed Maya drafts", () => {
  it("keeps the full active workspace needed to resume on another device", () => {
    const snapshot = sanitizeServerMayaDraftSnapshot({
      isOpen: true,
      savedAt: Date.now(),
      chatId: "chat_abc",
      session: {
        aesthetic: {
          id: "cafe-minimalist-paris",
          name: "Cafe Minimalist Paris",
          blurb: "Soft cafe editorial.",
          coverImage: "https://example.com/cover.png",
          thumbnails: ["https://example.com/one.png"],
          shotCount: 6,
          intent: "Cafe photoshoot.",
        },
        outputFormat: "carousel",
        referenceSelfieUrl: "https://example.com/selfie.png",
        graphicText: null,
        seedPrompt: "Make this one feel like a soft launch.",
        startedAt: 123,
      },
      messages: [{ id: "m1", role: "assistant", parts: [{ type: "text", text: "Pick one." }] }],
      genState: {
        "m1:concept-1": {
          status: "done",
          imageUrls: ["https://blob.vercel-storage.com/final.png"],
        },
        "m1:concept-2": {
          status: "generating",
          previewUrl: "data:image/png;base64,abc",
        },
      },
      generatedOnce: true,
      setupOpen: false,
    })

    expect(snapshot?.isOpen).toBe(true)
    expect(snapshot?.session.aesthetic.name).toBe("Cafe Minimalist Paris")
    expect(snapshot?.session.outputFormat).toBe("carousel")
    expect(snapshot?.genState["m1:concept-1"]?.status).toBe("done")
    expect(snapshot?.genState["m1:concept-2"]?.status).toBe("idle")
  })

  it("rejects stale or ownerless server drafts", () => {
    const base = {
      isOpen: true,
      savedAt: Date.now(),
      chatId: "chat_abc",
      session: {
        aesthetic: {
          id: "cafe-minimalist-paris",
          name: "Cafe Minimalist Paris",
          blurb: "Soft cafe editorial.",
          coverImage: "",
          thumbnails: [],
          shotCount: 6,
          intent: "Cafe photoshoot.",
        },
        outputFormat: "photo",
        referenceSelfieUrl: null,
        graphicText: null,
        startedAt: 123,
      },
      messages: [],
      genState: {},
      generatedOnce: false,
      setupOpen: true,
    }

    expect(sanitizeServerMayaDraftSnapshot({ ...base, chatId: "" })).toBeNull()
    expect(
      sanitizeServerMayaDraftSnapshot({
        ...base,
        savedAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
      })
    ).toBeNull()
    expect(
      sanitizeServerMayaDraftSnapshot({
        ...base,
        session: { ...base.session, outputFormat: "video" },
      })
    ).toBeNull()
  })
})
