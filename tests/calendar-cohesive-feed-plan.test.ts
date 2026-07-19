import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { buildCohesiveFeedPlan, resolveFeedArchetype } from "@/lib/feed-planner/cohesive-feed-plan"
import { buildAutoDraftPrompt } from "@/lib/feed-planner/auto-draft"
import { validateFeedMonthPlan } from "@/lib/feed-planner/write-auto-draft"

describe("Calendar cohesive feed planning", () => {
  it("chooses the strongest feed structure from the member's business", () => {
    expect(resolveFeedArchetype({ business_type: "Personal brand coach" })).toBe("personal_brand")
    expect(resolveFeedArchetype({ business_type: "Hair salon and colour services" })).toBe(
      "service"
    )
    expect(resolveFeedArchetype({ business_type: "Slow fashion product shop" })).toBe("product")
    expect(resolveFeedArchetype({ business_type: "Online course educator" })).toBe("expert")
  })

  it("plans one connected feed with people, work, proof, teaching, and selling", () => {
    const plan = buildCohesiveFeedPlan({
      personalBrand: {
        business_type: "Personal brand photographer",
        ideal_audience: "Women building visible businesses",
        current_situation: "Personal brand shoots",
      },
      postCount: 9,
      grid: [
        "selfie",
        "flatlay",
        "detail",
        "selfie",
        "flatlay",
        "detail",
        "selfie",
        "flatlay",
        "detail",
      ],
    })

    expect(plan.archetype).toBe("service")
    expect(plan.slots).toHaveLength(9)
    expect(new Set(plan.slots.map(slot => slot.contentRole))).toEqual(
      new Set(["connect", "teach", "prove", "offer", "process", "atmosphere"])
    )
    expect(plan.slots.some(slot => slot.plannedFormat === "carousel")).toBe(true)
    expect(plan.slots.some(slot => slot.plannedFormat === "reel-cover")).toBe(true)
    expect(plan.slots.every(slot => slot.sourcePreference === "member_content_first")).toBe(true)
    expect(plan.slots.map(slot => slot.enginePostType)).toEqual([
      "selfie",
      "flatlay",
      "detail",
      "selfie",
      "flatlay",
      "detail",
      "selfie",
      "flatlay",
      "detail",
    ])
    for (let index = 1; index < plan.slots.length; index += 1) {
      expect(plan.slots[index].visualWeight).not.toBe(plan.slots[index - 1].visualWeight)
    }
    expect(plan.feedStory).toContain("founder")
    expect(plan.visualRhythm.toLowerCase()).toContain("people")
    expect(plan.visualRhythm.toLowerCase()).toContain("details")
  })

  it("gives Maya the complete slot map instead of nine isolated prompts", () => {
    const cohesivePlan = buildCohesiveFeedPlan({
      personalBrand: { business_type: "Business educator and online course creator" },
      postCount: 9,
      grid: ["selfie", "flatlay", "detail"],
    })
    const prompt = buildAutoDraftPrompt({
      agentName: "Maya",
      periodMonth: "2026-08",
      postCount: 9,
      cadence: 3,
      daysInMonth: 31,
      brandContext: "What she does: Business educator",
      cohesivePlan,
    })

    expect(prompt.system).toContain("one connected feed")
    expect(prompt.system).toContain("Use her own photos and videos first")
    expect(prompt.system).toContain("Create only what is missing")
    expect(prompt.system).toContain("Never copy another creator's face")
    expect(prompt.userMessage).toContain("POST 1")
    expect(prompt.userMessage).toContain("POST 9")
    expect(prompt.userMessage).toContain("carousel")
    expect(prompt.userMessage).toContain("reel-cover")
  })

  it("rejects a partial month so members never receive a half-planned grid", () => {
    const cohesivePlan = buildCohesiveFeedPlan({
      personalBrand: { business_type: "Coach" },
      postCount: 9,
      grid: ["selfie", "flatlay", "detail"],
    })

    expect(
      validateFeedMonthPlan(
        {
          themeSummary: "A useful month",
          schedulingRationale: "Three posts a week",
          posts: [
            {
              position: 1,
              plannedDate: "2026-08-03",
              contentPillar: "Useful lesson",
              title: "Start here",
              caption: "One clear place to begin.",
            },
          ],
        },
        "2026-08",
        cohesivePlan
      )
    ).toBeNull()
  })

  it("persists the whole-feed story and each post's creative job", () => {
    const source = readFileSync("lib/feed-planner/write-auto-draft.ts", "utf8")

    expect(source).toContain("feed_story = ${plan.feedStory}")
    expect(source).toContain("visual_rhythm = ${plan.visualRhythm}")
    expect(source).toContain("purpose, shot_type, visual_direction, background, pro_mode_type")
    expect(source).toContain("${direction.contentRole}")
    expect(source).toContain("${direction.shotRole}")
    expect(source).toContain("plan.posts.slice(existingPostCount)")
    expect(source).toContain("purpose = COALESCE(purpose")
  })
})
