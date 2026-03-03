import { describe, expect, it } from "vitest"

import { parseMayaToolMarkers, stripMayaToolMarkers } from "@/lib/maya/tool-markers"

describe("parseMayaToolMarkers", () => {
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
})

describe("stripMayaToolMarkers", () => {
  it("removes edit asset marker text from assistant message", () => {
    const stripped = stripMayaToolMarkers(
      'Updating now.\n[EDIT_ASSET:calendar|Content%20Calendar]\nContinue with your next tweak.',
    )
    expect(stripped).toBe("Updating now. Continue with your next tweak.")
  })
})
