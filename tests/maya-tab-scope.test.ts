import { describe, expect, it } from "vitest"

import {
  encodeMayaTabHandoffPayload,
  getMayaVideosTabQuickPrompts,
  isMayaTabScopedChatEnabled,
  resolveMayaChatTypeForTab,
  resolveMayaTabHandoff,
} from "@/lib/maya/tab-scope"

describe("maya tab scope", () => {
  it("routes videos tab to an isolated videos chat type when tab-scoped chat is enabled", () => {
    expect(resolveMayaChatTypeForTab({ activeTab: "videos", proMode: false, enabled: true })).toBe("videos")
    expect(resolveMayaChatTypeForTab({ activeTab: "videos", proMode: true, enabled: true })).toBe("videos")
  })

  it("keeps photos tab on the existing photo chat types", () => {
    expect(resolveMayaChatTypeForTab({ activeTab: "photos", proMode: false, enabled: true })).toBe("maya")
    expect(resolveMayaChatTypeForTab({ activeTab: "photos", proMode: true, enabled: true })).toBe("pro")
  })

  it("defaults the tab-scoped feature flag to enabled unless explicitly disabled", () => {
    expect(isMayaTabScopedChatEnabled(undefined)).toBe(true)
    expect(isMayaTabScopedChatEnabled("false")).toBe(false)
    expect(isMayaTabScopedChatEnabled("0")).toBe(false)
  })

  it("hands off video asks from Chat to Videos", () => {
    const handoff = resolveMayaTabHandoff({
      activeTab: "photos",
      userText: "Animate this into a reel for me",
    })

    expect(handoff).toMatchObject({
      targetTab: "videos",
      ctaLabel: "Go to Videos",
    })
  })

  it("hands off photo and planning asks from Videos to Photos", () => {
    const handoff = resolveMayaTabHandoff({
      activeTab: "videos",
      userText: "Plan my week and help me make photos for it",
    })

    expect(handoff).toMatchObject({
      targetTab: "photos",
      ctaLabel: "Go to Photos",
    })
  })

  it("keeps trained-model photo prompts inside Photos", () => {
    expect(
      resolveMayaTabHandoff({
        activeTab: "photos",
        userText: "Use my trained model and create a photo for my brand",
      }),
    ).toBeNull()
  })

  it("keeps gallery selection asks inside Videos", () => {
    expect(
      resolveMayaTabHandoff({
        activeTab: "videos",
        userText: "Show me my gallery so I can pick a photo",
      }),
    ).toBeNull()
  })

  it("encodes tab handoff payloads for persistence markers", () => {
    const handoff = resolveMayaTabHandoff({
      activeTab: "photos",
      userText: "Make a reel from this photo",
    })

    expect(handoff).toBeTruthy()
    expect(encodeMayaTabHandoffPayload(handoff!)).toContain("videos|")
  })

  it("returns video prompts that keep Maya in the video workflow", () => {
    const prompts = getMayaVideosTabQuickPrompts()
    expect(prompts.map((item) => item.label)).toEqual([
      "Animate a Photo",
      "Latest Photo",
      "Create a Reel",
    ])
  })
})
