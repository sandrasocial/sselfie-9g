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

    expect(prompts.map((item) => item.label)).toContain("My Model")
    expect(prompts.map((item) => item.label)).toContain("Plan My Week")
    expect(prompts.map((item) => item.label)).not.toContain("Train My Model")
  })

  it("gives selfie-specific prompts in selfie mode", () => {
    const prompts = getMayaSurfaceQuickPrompts({
      activeTab: "photos",
      proMode: true,
      hasTrainedModel: true,
    })

    expect(prompts.map((item) => item.label)).toContain("New Photo")
    expect(prompts.map((item) => item.label)).toContain("Upload & Create")
    expect(prompts.map((item) => item.label)).toContain("Plan My Week")
    expect(prompts.map((item) => item.label)).not.toContain("Train My Model")
  })

  it("reuses the dedicated videos prompt contract in Videos", () => {
    const prompts = getMayaSurfaceQuickPrompts({
      activeTab: "videos",
      proMode: false,
      hasTrainedModel: false,
    })

    expect(prompts.map((item) => item.label)).toEqual([
      "Animate a Photo",
      "Latest Photo",
      "Create a Reel",
    ])
  })
})
