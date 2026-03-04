import { describe, expect, it } from "vitest"
import { detectMayaToolDispatchIntent, extractLatestUserText } from "@/lib/maya/intent-dispatcher"
import { parseMayaToolMarkers, stripMayaToolMarkers } from "@/lib/maya/tool-markers"

describe("maya phase 2 tool dispatcher", () => {
  it("routes onboarding/help intent to show_capabilities marker response", () => {
    const intent = detectMayaToolDispatchIntent("what can you do for me here?")
    expect(intent?.tool).toBe("show_capabilities")
    expect(intent?.responseText).toContain("[SHOW_CAPABILITIES]")
  })

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

  it("routes create photo intent to generate image marker", () => {
    const intent = detectMayaToolDispatchIntent("I want to create a photo for my offer")
    expect(intent?.tool).toBe("generate_image")
    expect(intent?.responseText).toContain("[GENERATE_IMAGE:choose_source]")
  })

  it("does not misroute mixed help + photo intent to capabilities", () => {
    const intent = detectMayaToolDispatchIntent("help me create a photo for launch week")
    expect(intent?.tool).toBe("generate_image")
  })

  it("routes upload selfie intent to upload zone marker", () => {
    const intent = detectMayaToolDispatchIntent("let me upload some selfies first")
    expect(intent?.tool).toBe("show_upload_zone")
    expect(intent?.responseText).toContain("[SHOW_UPLOAD_ZONE:selfies]")
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
  it("parses phase 2 markers from assistant text", () => {
    const markers = parseMayaToolMarkers(
      "Opening now [SHOW_CAPABILITIES]\n[SHOW_GALLERY]\nSaved [SAVE_TO_GALLERY:ai_55]\nStart [GENERATE_IMAGE:base_model]\nUpload [SHOW_UPLOAD_ZONE:products]",
    )
    expect(markers).toEqual([
      { tool: "show_capabilities" },
      { tool: "show_gallery" },
      { tool: "save_to_gallery", target: "explicit", imageId: "ai_55" },
      { tool: "generate_image", source: "base_model" },
      { tool: "show_upload_zone", category: "products" },
    ])
  })

  it("strips tool markers from persisted assistant text", () => {
    const stripped = stripMayaToolMarkers(
      "Opening your workspace.\n[SHOW_CAPABILITIES]\n[SHOW_GALLERY]\nDone.\n[SAVE_TO_GALLERY:latest]\n[GENERATE_IMAGE:choose_source]\n[SHOW_UPLOAD_ZONE:selfies]",
    )
    expect(stripped).toBe("Opening your workspace. Done.")
  })
})
