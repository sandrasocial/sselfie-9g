import { describe, expect, it } from "vitest"
import {
  enforceCaptionPublishingRules,
  extractHashtagsFromCaption,
  hasBannedCaptionLanguage,
  hasOutdatedCaptionYear,
  hasUnverifiedFirstPersonClaim,
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
          "#personalbrand #contentstrategy #storytelling #instagramtips #creatorbusiness"
      )
    ).toBe(false)
  })

  it("flags Sandra's banned words and em-dashes for a rewrite pass", () => {
    const longBody =
      "For months I kept posting polished content that looked perfect but sounded nothing like me, and people scrolled past without replying. The shift happened when I shared one messy lesson from a bad launch and explained exactly what I changed the next day. That post brought better conversations than the previous ten combined. If you're stuck, pick one real moment from this week and turn it into tomorrow's post, then tell me how your audience responds. Nothing fancy, just honest words that sound like you actually talk."

    expect(hasBannedCaptionLanguage("This will transform your brand overnight.")).toBe(true)
    expect(hasBannedCaptionLanguage("Time to unlock your potential, babe.")).toBe(true)
    expect(hasBannedCaptionLanguage("It's a total game-changer for your feed.")).toBe(true)
    expect(hasBannedCaptionLanguage("Leverage this one trick.")).toBe(true)
    expect(hasBannedCaptionLanguage("One photo — one story.")).toBe(true)
    expect(hasBannedCaptionLanguage("Your transformation story matters.")).toBe(false)
    expect(hasBannedCaptionLanguage("Still you, just seen clearly.")).toBe(false)

    expect(shouldRegenerateCaption(`Ready to skyrocket your reach?\n\n${longBody}`)).toBe(true)
    expect(shouldRegenerateCaption(`I almost quit three times.\n\n${longBody}`)).toBe(false)
  })

  it("normalizes em-dashes out of published captions", () => {
    const cleaned = enforceCaptionPublishingRules({
      caption:
        "One photo — one story.\n\nFor months I kept posting polished content that looked perfect but sounded nothing like me, and people scrolled past without replying. The shift happened when I shared one messy lesson from a bad launch and explained exactly what I changed the next day. That post brought better conversations than the previous ten combined.\n\nPick one real moment from this week and turn it into tomorrow's post.",
    })

    expect(cleaned).not.toContain("—")
    expect(cleaned).toContain("One photo: one story.")
  })

  it("rejects invented first-person experience while allowing a conversational ask", () => {
    expect(
      hasUnverifiedFirstPersonClaim(
        "Here's the trick I give every busy mom I talk to. My clients use it every morning.",
        null
      )
    ).toBe(true)
    expect(
      hasUnverifiedFirstPersonClaim(
        "Try one small step tomorrow. Tell me which one feels realistic for you.",
        null
      )
    ).toBe(false)
    expect(
      hasUnverifiedFirstPersonClaim(
        "I started with five quiet minutes before breakfast.",
        "I started with five quiet minutes before breakfast."
      )
    ).toBe(false)
  })

  it("rejects stale years unless the member supplied that year as source material", () => {
    expect(hasOutdatedCaptionYear("You don't need a new you for 2024.", null, 2026)).toBe(true)
    expect(
      hasOutdatedCaptionYear(
        "In 2024 I started again.",
        "In 2024 I started again after closing my shop.",
        2026
      )
    ).toBe(false)
    expect(hasOutdatedCaptionYear("Build one routine you can keep in 2026.", null, 2026)).toBe(
      false
    )
  })
})
