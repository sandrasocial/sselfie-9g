import { describe, expect, it } from "vitest"

import { getMayaSurfaceQuickPrompts } from "@/lib/maya/prompt-contract"

describe("maya prompt contract", () => {
  it("keeps the photos surface photo-first for untrained classic users", () => {
    const prompts = getMayaSurfaceQuickPrompts({
      activeTab: "photos",
      proMode: false,
      hasTrainedModel: false,
    })

    expect(prompts.map((item) => item.label)).toContain("Train My Model")
    expect(prompts.map((item) => item.label)).not.toContain("Create Calendar")
    expect(prompts.map((item) => item.label)).not.toContain("Plan my week")
  })

  it("keeps the photos surface photo-first for trained classic users", () => {
    const prompts = getMayaSurfaceQuickPrompts({
      activeTab: "photos",
      proMode: false,
      hasTrainedModel: true,
    })

    expect(prompts.map((item) => item.label)).toContain("Use My Model")
    expect(prompts.map((item) => item.label)).not.toContain("Train My Model")
  })

  it("gives selfie-specific prompts in selfie mode", () => {
    const prompts = getMayaSurfaceQuickPrompts({
      activeTab: "photos",
      proMode: true,
      hasTrainedModel: true,
    })

    expect(prompts.map((item) => item.label)).toContain("Use My Selfies")
    expect(prompts.map((item) => item.label)).toContain("Upload References")
    expect(prompts.map((item) => item.label)).not.toContain("Create Calendar")
  })

  it("reuses the dedicated videos prompt contract in Videos", () => {
    const prompts = getMayaSurfaceQuickPrompts({
      activeTab: "videos",
      proMode: false,
      hasTrainedModel: false,
    })

    expect(prompts.map((item) => item.label)).toEqual([
      "Make a Reel",
      "Choose a Photo",
      "Use My Latest Photo",
      "Show Motion Ideas",
    ])
  })
})
