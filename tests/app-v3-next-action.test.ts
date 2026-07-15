import { describe, expect, it } from "vitest"

import {
  recommendedGraphicTextStyle,
  shouldContinueCompletedFormatSwitch,
} from "@/lib/app-v3/maya/next-action"

describe("Maya recommended next actions", () => {
  it("gives publishable graphic recommendations a text style automatically", () => {
    expect(recommendedGraphicTextStyle("reel-cover", null)).toBe("editorial-serif-center")
    expect(recommendedGraphicTextStyle("story-slide", null)).toBe("editorial-serif-center")
    expect(recommendedGraphicTextStyle("story-sequence", null)).toBe("cutout-editorial")
    expect(recommendedGraphicTextStyle("carousel", null)).toBe("cutout-editorial")
  })

  it("keeps a member's remembered text style", () => {
    expect(recommendedGraphicTextStyle("reel-cover", "lower-third-accent")).toBe(
      "lower-third-accent",
    )
  })

  it("does not invent text settings for photo, photoshoot, or video actions", () => {
    expect(recommendedGraphicTextStyle("photo", null)).toBeNull()
    expect(recommendedGraphicTextStyle("photoshoot", null)).toBeNull()
    expect(recommendedGraphicTextStyle("video", null)).toBeNull()
  })

  it("continues a redundant set_format response after a recommended Stories handoff", () => {
    expect(
      shouldContinueCompletedFormatSwitch({
        selectedFormat: "story-sequence",
        switchedFormat: "story-sequence",
        textMode: "with-text",
        textStyleSelected: true,
      })
    ).toBe(true)
  })

  it("keeps real format changes and unfinished graphic choices on their visible gates", () => {
    expect(
      shouldContinueCompletedFormatSwitch({
        selectedFormat: "reel-cover",
        switchedFormat: "story-sequence",
        textMode: "with-text",
        textStyleSelected: true,
      })
    ).toBe(false)

    expect(
      shouldContinueCompletedFormatSwitch({
        selectedFormat: "story-sequence",
        switchedFormat: "story-sequence",
        textMode: null,
        textStyleSelected: false,
      })
    ).toBe(false)
  })
})
