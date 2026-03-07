import { describe, expect, it } from "vitest"
import {
  enforceCaptionPublishingRules,
  extractHashtagsFromCaption,
  shouldRegenerateCaption,
} from "@/lib/feed-planner/caption-writer"

describe("feed caption quality guards", () => {
  it("removes prompt leakage and enforces max 5 hashtags", () => {
    const rawCaption = [
      "POST CONTEXT: Post 1 of 9",
      "Nobody talks about this part of building a brand.",
      "",
      "I used to hide behind perfect posts, but honest stories are what actually convert.",
      "",
      "What story are you ready to post this week?",
      "",
      "#personalbrand #instagramtips #storytelling #contentstrategy #creatorbusiness #marketing #growth",
    ].join("\n")

    const cleaned = enforceCaptionPublishingRules({
      caption: rawCaption,
    })

    expect(cleaned).not.toContain("POST CONTEXT")
    expect(extractHashtagsFromCaption(cleaned)).toHaveLength(5)
  })

  it("flags weak captions for regeneration", () => {
    expect(shouldRegenerateCaption("Generating caption...")).toBe(true)
    expect(shouldRegenerateCaption("Quick tip.\n\n#a #b #c #d #e #f")).toBe(true)
    expect(
      shouldRegenerateCaption(
        "I almost quit three times before this started working.\n\n" +
          "For months I kept posting polished content that looked perfect but sounded nothing like me, and people scrolled past without replying. The shift happened when I shared one messy lesson from a bad launch and explained exactly what I changed the next day. That post brought better conversations than the previous ten combined.\n\n" +
          "If you're stuck, pick one real moment from this week and turn it into tomorrow's post, then tell me how your audience responds.\n\n" +
          "#personalbrand #contentstrategy #storytelling #instagramtips #creatorbusiness",
      ),
    ).toBe(false)
  })
})
