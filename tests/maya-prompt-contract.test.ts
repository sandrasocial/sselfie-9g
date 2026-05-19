import { describe, expect, it } from "vitest"

import { getMayaSurfaceQuickPrompts } from "@/lib/maya/prompt-contract"

describe("maya prompt contract", () => {
  it("keeps the photos surface photo-first for untrained classic users", () => {
    const prompts = getMayaSurfaceQuickPrompts({
      activeTab: "photos",
      proMode: false,
      hasTrainedModel: false,
    })

    expect(prompts.map((item) => item.label)).toContain("Set up my look")
    expect(prompts.map((item) => item.label)).not.toContain("Create Calendar")
    expect(prompts.map((item) => item.label)).not.toContain("Plan my week")
  })

  it("keeps the photos surface photo-first for trained classic users", () => {
    const prompts = getMayaSurfaceQuickPrompts({
      activeTab: "photos",
      proMode: false,
      hasTrainedModel: true,
    })

    expect(prompts.map((item) => item.label)).toContain("Use my look")
    expect(prompts.map((item) => item.label)).toContain("Photo ideas")
    expect(prompts.map((item) => item.label)).toContain("Use saved photo")
    expect(prompts.map((item) => item.label)).not.toContain("Plan My Week")
    expect(prompts.map((item) => item.label)).not.toContain("Write a caption")
    expect(prompts.map((item) => item.label)).not.toContain("Set up my look")
  })

  it("gives selfie-specific prompts in selfie mode", () => {
    const prompts = getMayaSurfaceQuickPrompts({
      activeTab: "photos",
      proMode: true,
      hasTrainedModel: true,
    })

    expect(prompts.map((item) => item.label)).toContain("Start with selfie")
    expect(prompts.map((item) => item.label)).toContain("Add photos")
    expect(prompts.map((item) => item.label)).toContain("Use saved photo")
    expect(prompts.map((item) => item.label)).not.toContain("Plan My Week")
    expect(prompts.map((item) => item.label)).not.toContain("Write a caption")
    expect(prompts.map((item) => item.label)).not.toContain("Set up my look")
  })

  it("reuses the dedicated videos prompt contract in Videos", () => {
    const prompts = getMayaSurfaceQuickPrompts({
      activeTab: "videos",
      proMode: false,
      hasTrainedModel: false,
    })

    expect(prompts.map((item) => item.label)).toEqual([
      "Make Video",
      "Latest Photo",
      "Create a Reel",
    ])
  })
})
