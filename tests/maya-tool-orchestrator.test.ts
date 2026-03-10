import { describe, expect, it } from "vitest"

import {
  estimateToolDispatchCredits,
  orchestrateMayaTurn,
} from "@/lib/maya/tool-orchestrator"

describe("orchestrateMayaTurn", () => {
  it("prioritizes remember commands over other actions", () => {
    const result = orchestrateMayaTurn({
      userText: "remember this: keep my tone clean and minimal",
      activeAssetContext: null,
    })

    expect(result.kind).toBe("remember")
    if (result.kind === "remember") {
      expect(result.intent.note).toContain("keep my tone clean and minimal")
    }
  })

  it("routes asset edit when active context exists", () => {
    const result = orchestrateMayaTurn({
      userText: "change the headline and CTA",
      activeAssetContext: {
        assetType: "calendar",
        assetLabel: "Content Calendar",
        assetId: "maya_calendar_123",
        updatedAt: new Date().toISOString(),
      },
    })

    expect(result.kind).toBe("asset_edit")
  })

  it("retires landing-page requests instead of collecting an offer brief", () => {
    const result = orchestrateMayaTurn({
      userText: "create a landing page for my studio membership offer",
      activeAssetContext: null,
    })

    expect(result.kind).toBe("page_generation_paused")
  })

  it("retires implicit landing-page help requests", () => {
    const result = orchestrateMayaTurn({
      userText: "can you help me with a landing page for my offer?",
      activeAssetContext: null,
    })

    expect(result.kind).toBe("page_generation_paused")
  })

  it("retires direct page creation even when the brief details are present", () => {
    const result = orchestrateMayaTurn({
      userText:
        "Create a landing page for my coaching offer that helps founders sign clients, target audience is female founders, price is €497",
      activeAssetContext: null,
    })

    expect(result.kind).toBe("page_generation_paused")
  })

  it("keeps the calendar path when a mixed request also mentions a retired landing page", () => {
    const result = orchestrateMayaTurn({
      userText: "Create a landing page and a content calendar for this launch",
      activeAssetContext: null,
    })

    expect(result.kind).toBe("asset_create")
    if (result.kind === "asset_create") {
      expect(result.intent.assetType).toBe("calendar")
    }
  })

  it("routes generate-image for mixed help + photo requests", () => {
    const result = orchestrateMayaTurn({
      userText: "help me create a photo for my new offer",
      activeAssetContext: null,
    })

    expect(result.kind).toBe("tool_dispatch")
    if (result.kind === "tool_dispatch") {
      expect(result.intent.tool).toBe("generate_image")
      expect(result.intent.responseText).toContain("[GENERATE_IMAGE:")
    }
  })

  it("routes explicit capability discovery prompts", () => {
    const result = orchestrateMayaTurn({
      userText: "what can you do in this app?",
      activeAssetContext: null,
    })

    expect(result.kind).toBe("tool_dispatch")
    if (result.kind === "tool_dispatch") {
      expect(result.intent.tool).toBe("show_capabilities")
    }
  })

  it("routes video requests into tool dispatch", () => {
    const result = orchestrateMayaTurn({
      userText: "animate this into a reel for me",
      activeAssetContext: null,
    })

    expect(result.kind).toBe("tool_dispatch")
    if (result.kind === "tool_dispatch") {
      expect(result.intent.tool).toBe("generate_video")
      expect(result.intent.responseText).toContain("[GENERATE_VIDEO]")
      expect(result.estimatedCredits).toBe(3)
    }
  })

  it("returns none for empty text", () => {
    const result = orchestrateMayaTurn({
      userText: "   ",
      activeAssetContext: null,
    })

    expect(result).toEqual({ kind: "none", reason: "empty_text" })
  })

  it("does not route workbook requests into structured asset creation", () => {
    const result = orchestrateMayaTurn({
      userText: "Create a workbook PDF draft for my coaching offer",
      activeAssetContext: null,
    })

    expect(result).toEqual({ kind: "none", reason: "no_match" })
  })

  it("retires landing-page creation even when page assets are explicitly disabled", () => {
    const result = orchestrateMayaTurn({
      userText: "Create a landing page for my studio offer",
      activeAssetContext: null,
      options: {
        allowPageAssetsInChat: false,
      },
    })

    expect(result.kind).toBe("page_generation_paused")
  })

  it("retires landing-page edit routing when page assets are disabled", () => {
    const result = orchestrateMayaTurn({
      userText: "Update this landing page headline",
      activeAssetContext: {
        assetType: "page",
        assetLabel: "Landing Page",
        assetId: "maya_page_123",
        updatedAt: new Date().toISOString(),
      },
      options: {
        allowPageAssetsInChat: false,
      },
    })

    expect(result.kind).toBe("page_generation_paused")
  })

  it("retires landing-page edits from active page context by default", () => {
    const result = orchestrateMayaTurn({
      userText: "Update this landing page headline",
      activeAssetContext: {
        assetType: "page",
        assetLabel: "Landing Page",
        assetId: "maya_page_123",
        updatedAt: new Date().toISOString(),
      },
    })

    expect(result.kind).toBe("page_generation_paused")
  })

  it("returns structured blocked action when structured ask misses runnable intent", () => {
    const result = orchestrateMayaTurn({
      userText: "content calendar for my launch this week",
      activeAssetContext: null,
    })

    expect(result.kind).toBe("structured_asset_blocked")
    if (result.kind === "structured_asset_blocked") {
      expect(result.intentClass).toBe("calendar")
      expect(result.errorReason).toBe("intent_match_failed")
      expect(result.executionMode).toBe("blocked")
      expect(result.requiresStructuredRender).toBe(true)
    }
  })
})

describe("estimateToolDispatchCredits", () => {
  it("assigns image credit estimates only when source is explicit", () => {
    expect(
      estimateToolDispatchCredits({
        tool: "generate_image",
        source: "selfies",
        responseText: "x",
      }),
    ).toBe(1)

    expect(
      estimateToolDispatchCredits({
        tool: "generate_image",
        source: "choose_source",
        responseText: "x",
      }),
    ).toBe(0)

    expect(
      estimateToolDispatchCredits({
        tool: "show_gallery",
        responseText: "x",
      }),
    ).toBe(0)

    expect(
      estimateToolDispatchCredits({
        tool: "generate_video",
        responseText: "x",
      }),
    ).toBe(3)
  })
})
