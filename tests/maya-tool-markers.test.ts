import { describe, expect, it } from "vitest"

import { parseMayaToolMarkers, stripMayaToolMarkers } from "@/lib/maya/tool-markers"

describe("parseMayaToolMarkers", () => {
  it("parses show capabilities marker", () => {
    const markers = parseMayaToolMarkers("Let me guide you.\n[SHOW_CAPABILITIES]")
    expect(markers).toEqual([{ tool: "show_capabilities" }])
  })

  it("parses edit asset markers with type and label payload", () => {
    const markers = parseMayaToolMarkers(
      'Starting now.\n[EDIT_ASSET:page|Landing%20Page]',
    )

    expect(markers).toEqual([
      {
        tool: "edit_asset",
        assetType: "page",
        assetLabel: "Landing Page",
      },
    ])
  })

  it("falls back safely for invalid payloads", () => {
    const markers = parseMayaToolMarkers("[EDIT_ASSET:invalid|Unknown]")
    expect(markers).toEqual([
      {
        tool: "edit_asset",
        assetType: "page",
        assetLabel: "Unknown",
      },
    ])
  })

  it("parses create asset marker with preview payload", () => {
    const markers = parseMayaToolMarkers(
      "[CREATE_ASSET:calendar|Content%20Calendar|maya_calendar_123|Weekly%20plan|%2Fstudio%3Ftab%3Dmaya]",
    )
    expect(markers).toEqual([
      {
        tool: "create_asset",
        assetType: "calendar",
        assetLabel: "Content Calendar",
        assetId: "maya_calendar_123",
        previewText: "Weekly plan",
        url: "/studio?tab=maya",
      },
    ])
  })
})

describe("stripMayaToolMarkers", () => {
  it("removes show capabilities marker text from assistant message", () => {
    const stripped = stripMayaToolMarkers(
      "Start here.\n[SHOW_CAPABILITIES]\nThen choose your next step.",
    )
    expect(stripped).toBe("Start here. Then choose your next step.")
  })

  it("removes edit asset marker text from assistant message", () => {
    const stripped = stripMayaToolMarkers(
      'Updating now.\n[EDIT_ASSET:calendar|Content%20Calendar]\nContinue with your next tweak.',
    )
    expect(stripped).toBe("Updating now. Continue with your next tweak.")
  })

  it("removes create asset marker text from assistant message", () => {
    const stripped = stripMayaToolMarkers(
      "Done.\n[CREATE_ASSET:page|Landing%20Page|maya_page_1|Draft%20ready|%2Fstudio]\nNext step.",
    )
    expect(stripped).toBe("Done. Next step.")
  })
})
