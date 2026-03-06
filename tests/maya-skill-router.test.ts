import { describe, expect, it } from "vitest"

import { selectMayaSkill } from "@/lib/maya/skills/skill-router"

describe("selectMayaSkill", () => {
  it("routes video asks to motion prompting skill", () => {
    const result = selectMayaSkill({
      latestUserText: "Animate this photo into a reel with cinematic movement",
      chatType: "maya",
      isStudioProMode: true,
    })

    expect(result.skillId).toBe("video_motion")
    expect(result.source).toBe("motion_prompting")
  })

  it("routes high fidelity image asks to nano banana skill", () => {
    const result = selectMayaSkill({
      latestUserText: "Create an editorial image with ultra realistic detail",
      chatType: "maya",
      isStudioProMode: true,
    })

    expect(result.skillId).toBe("image_high_fidelity")
    expect(result.source).toBe("nano_banana_pro")
  })

  it("falls back to baseline for general chat", () => {
    const result = selectMayaSkill({
      latestUserText: "How are my posts doing this week?",
      chatType: "maya",
      isStudioProMode: false,
    })

    expect(result.skillId).toBe("fallback_image")
    expect(result.source).toBe("baseline")
  })
})
