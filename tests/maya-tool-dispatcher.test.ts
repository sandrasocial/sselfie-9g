import { describe, expect, it } from "vitest"
import { detectMayaToolDispatchIntent, extractLatestUserText } from "@/lib/maya/intent-dispatcher"
import { parseMayaToolMarkers, stripMayaToolMarkers } from "@/lib/maya/tool-markers"

describe("maya phase 1 tool dispatcher", () => {
  it("routes gallery view intent to show_gallery marker response", () => {
    const intent = detectMayaToolDispatchIntent("can you show me my gallery?")
    expect(intent?.tool).toBe("show_gallery")
    expect(intent?.responseText).toContain("[SHOW_GALLERY]")
  })

  it("routes save intent with explicit image id to save_to_gallery marker response", () => {
    const intent = detectMayaToolDispatchIntent("save ai_123 to my gallery")
    expect(intent?.tool).toBe("save_to_gallery")
    expect(intent?.imageId).toBe("ai_123")
    expect(intent?.responseText).toContain("[SAVE_TO_GALLERY:ai_123]")
  })

  it("defaults save intent payload to latest when no image id is provided", () => {
    const intent = detectMayaToolDispatchIntent("please save this to gallery")
    expect(intent?.tool).toBe("save_to_gallery")
    expect(intent?.responseText).toContain("[SAVE_TO_GALLERY:latest]")
  })

  it("returns no tool intent for regular chat questions", () => {
    const intent = detectMayaToolDispatchIntent("how can I improve my hook?")
    expect(intent).toBeNull()
  })

  it("extracts latest user text from parts-first chat messages", () => {
    const text = extractLatestUserText([
      { role: "user", parts: [{ type: "text", text: "first" }] },
      { role: "assistant", parts: [{ type: "text", text: "ok" }] },
      { role: "user", parts: [{ type: "text", text: "latest message" }] },
    ])
    expect(text).toBe("latest message")
  })
})

describe("maya tool markers", () => {
  it("parses show and save markers from assistant text", () => {
    const markers = parseMayaToolMarkers(
      "Opening now [SHOW_GALLERY]\nSaved [SAVE_TO_GALLERY:ai_55]",
    )
    expect(markers).toEqual([
      { tool: "show_gallery" },
      { tool: "save_to_gallery", target: "explicit", imageId: "ai_55" },
    ])
  })

  it("strips tool markers from persisted assistant text", () => {
    const stripped = stripMayaToolMarkers(
      "Opening your gallery.\n[SHOW_GALLERY]\nDone.\n[SAVE_TO_GALLERY:latest]",
    )
    expect(stripped).toBe("Opening your gallery. Done.")
  })
})
