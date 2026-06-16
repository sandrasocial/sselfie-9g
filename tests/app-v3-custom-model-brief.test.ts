import { describe, expect, it } from "vitest"
import { buildCustomModelConceptPrompt } from "@/lib/app-v3/custom-model-brief"

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
})
