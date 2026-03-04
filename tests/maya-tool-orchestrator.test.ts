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
        assetType: "page",
        assetLabel: "Landing Page",
        assetId: "maya_page_123",
        updatedAt: new Date().toISOString(),
      },
    })

    expect(result.kind).toBe("asset_edit")
  })

  it("routes asset creation when user asks for a page", () => {
    const result = orchestrateMayaTurn({
      userText: "create a landing page for my studio membership offer",
      activeAssetContext: null,
    })

    expect(result.kind).toBe("asset_create")
    if (result.kind === "asset_create") {
      expect(result.intent.assetType).toBe("page")
    }
  })

  it("routes multi-step asset creation for combined requests", () => {
    const result = orchestrateMayaTurn({
      userText: "Create a landing page and a content calendar for this launch",
      activeAssetContext: null,
    })

    expect(result.kind).toBe("multi_step_asset_create")
    if (result.kind === "multi_step_asset_create") {
      expect(result.intents.map((intent) => intent.assetType)).toEqual(["page", "calendar"])
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

  it("returns none for empty text", () => {
    const result = orchestrateMayaTurn({
      userText: "   ",
      activeAssetContext: null,
    })

    expect(result).toEqual({ kind: "none", reason: "empty_text" })
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
  })
})
