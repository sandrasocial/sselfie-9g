import { describe, expect, it } from "vitest"

import { parseMayaToolMarkers, stripMayaToolMarkers } from "@/lib/maya/tool-markers"

describe("parseMayaToolMarkers", () => {
  it("parses show capabilities marker", () => {
    const markers = parseMayaToolMarkers("Let me guide you.\n[SHOW_CAPABILITIES]")
    expect(markers).toEqual([{ tool: "show_capabilities" }])
  })

  it("parses show studio hub marker", () => {
    const markers = parseMayaToolMarkers("Your assets are ready.\n[SHOW_STUDIO_HUB]")
    expect(markers).toEqual([{ tool: "show_studio_hub" }])
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

  it("parses collect offer brief marker", () => {
    const markers = parseMayaToolMarkers(
      "Let's lock your offer details first.\n[COLLECT_OFFER_BRIEF:page]",
    )
    expect(markers).toEqual([
      {
        tool: "collect_offer_brief",
        assetType: "page",
      },
    ])
  })

  it("parses collect brief marker with calendar payload", () => {
    const payload = encodeURIComponent(
      JSON.stringify({
        assetType: "calendar",
        prefill: {
          offerType: "Studio Membership",
        },
        missingFields: ["idealClient"],
      }),
    )
    const markers = parseMayaToolMarkers(`[COLLECT_OFFER_BRIEF:${payload}]`)
    expect(markers).toEqual([
      {
        tool: "collect_offer_brief",
        assetType: "calendar",
        prefill: {
          offerType: "Studio Membership",
        },
        missingFields: ["idealClient"],
      },
    ])
  })

  it("parses generate video marker", () => {
    const markers = parseMayaToolMarkers(
      "Let's animate this shot.\n[GENERATE_VIDEO]",
    )
    expect(markers).toEqual([{ tool: "generate_video" }])
  })

  it("parses Maya tab handoff marker", () => {
    const markers = parseMayaToolMarkers(
      "Let's move this.\n[SWITCH_MAYA_TAB:videos|Let%27s%20make%20this%20in%20Videos|Videos%20has%20its%20own%20chat.|Go%20to%20Videos]",
    )
    expect(markers).toEqual([
      {
        tool: "switch_maya_tab",
        targetTab: "videos",
        title: "Let's make this in Videos",
        subtitle: "Videos has its own chat.",
        ctaLabel: "Go to Videos",
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

  it("removes show studio hub marker text from assistant message", () => {
    const stripped = stripMayaToolMarkers(
      "Opening your assets.\n[SHOW_STUDIO_HUB]\nPick what to continue.",
    )
    expect(stripped).toBe("Opening your assets. Pick what to continue.")
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

  it("removes collect offer brief marker text from assistant message", () => {
    const stripped = stripMayaToolMarkers(
      "Quick brief first.\n[COLLECT_OFFER_BRIEF:page]\nThen I will generate your draft.",
    )
    expect(stripped).toBe("Quick brief first. Then I will generate your draft.")
  })

  it("removes submit offer brief marker text from user message", () => {
    const stripped = stripMayaToolMarkers(
      "Here is my brief.\n[SUBMIT_OFFER_BRIEF:%7B%22assetType%22%3A%22page%22%7D]",
    )
    expect(stripped).toBe("Here is my brief.")
  })

  it("removes generate video marker text from assistant message", () => {
    const stripped = stripMayaToolMarkers(
      "Animation ready.\n[GENERATE_VIDEO]\nPick your source image.",
    )
    expect(stripped).toBe("Animation ready. Pick your source image.")
  })

  it("removes switch tab marker text from assistant message", () => {
    const stripped = stripMayaToolMarkers(
      "Let's move this.\n[SWITCH_MAYA_TAB:videos|Let%27s%20make%20this%20in%20Videos|Videos%20has%20its%20own%20chat.|Go%20to%20Videos]\nSee you there.",
    )
    expect(stripped).toBe("Let's move this. See you there.")
  })

  it("removes persisted video card markers from assistant message", () => {
    const stripped = stripMayaToolMarkers(
      "Your video is ready.\n[VIDEO_CARD:%7B%22videoUrl%22%3A%22https%3A%2F%2Fexample.com%2Fvideo.mp4%22%7D]",
    )
    expect(stripped).toBe("Your video is ready.")
  })
})
