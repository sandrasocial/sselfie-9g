import { describe, expect, it } from "vitest"
import {
  buildCustomModelConceptPrompt,
  buildVideoMotionPrompt,
} from "@/lib/app-v3/custom-model-brief"

describe("buildCustomModelConceptPrompt", () => {
  it("turns an app-v3 creative brief into a classic trained-model prompt", () => {
    expect(
      buildCustomModelConceptPrompt({
        outfit: "cream trench coat over black turtleneck",
        setting: "marble cafe corner table",
        mood: "calm, editorial, quietly confident",
        pose: "seated with one hand around a coffee cup",
        cameraSpec: "Hasselblad X2D 100C, 55mm lens",
        lighting: "soft window light with gentle contrast",
      }),
    ).toBe(
      "cream trench coat over black turtleneck, marble cafe corner table, calm, editorial, quietly confident, seated with one hand around a coffee cup, Hasselblad X2D 100C, 55mm lens, soft window light with gentle contrast",
    )
  })

  it("prefers explicit video motion prompt for app-v3 video concepts", () => {
    expect(
      buildVideoMotionPrompt({
        outfit: "cream trench coat",
        setting: "marble cafe",
        mood: "quiet confidence",
        pose: "she turns slightly toward the window",
        cameraSpec: "Hasselblad X2D",
        lighting: "soft window light",
        graphic: {
          motionPrompt:
            "slow camera push-in, natural blink, tiny hand movement on coffee cup, hair moves softly",
        },
      }),
    ).toBe("slow camera push-in, natural blink, tiny hand movement on coffee cup, hair moves softly")
  })

  it("builds a safe fallback motion prompt from a still-image brief", () => {
    const prompt = buildVideoMotionPrompt({
      outfit: "cream trench coat",
      setting: "marble cafe",
      mood: "quiet confidence",
      pose: "she turns slightly toward the window",
      cameraSpec: "Hasselblad X2D",
      lighting: "soft window light",
    })

    expect(prompt).toContain("she turns slightly toward the window")
    expect(prompt).toContain("gentle camera push-in")
    expect(prompt).toContain("preserve the same face and body")
    expect(prompt).toContain("no subtitles or text overlays")
  })
})
