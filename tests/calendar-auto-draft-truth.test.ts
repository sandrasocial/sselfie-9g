import { describe, expect, it } from "vitest"
import {
  buildAutoDraftPrompt,
  containsUnsupportedExperienceClaim,
  hasSufficientCalendarContext,
  isUnsupportedAutoDraftPost,
} from "@/lib/feed-planner/auto-draft"

describe("Calendar first-grid truth guard", () => {
  it("forbids unsupported personal and customer claims when Maya has little context", () => {
    const prompt = buildAutoDraftPrompt({
      agentName: "Maya",
      periodMonth: "2026-07",
      postCount: 12,
      cadence: 3,
      daysInMonth: 31,
      brandContext: null,
    })

    expect(prompt.system).toContain(
      "Never invent facts, numbers, customer results, personal history, testimonials, pricing, timelines, or proof"
    )
    expect(prompt.system).toContain("Use only facts explicitly present in the context")
    expect(prompt.system).toContain(
      "Do not write first-person autobiography, quantified proof, or a client story unless the supplied context supports it"
    )
    expect(prompt.system).toContain("Do not imply repeated experience")
    expect(prompt.system).toContain("Do not invent the steps, method, promises, or deliverables")
    expect(prompt.userMessage).toContain(
      "Use observations, useful how-to guidance, thoughtful questions, and editable caption structures"
    )
    expect(prompt.userMessage).toContain("Do not fill missing context with plausible details")
  })

  it("catches quiet social-proof and experience claims before they reach a new user's grid", () => {
    expect(
      containsUnsupportedExperienceClaim(
        "A lot of people ask what actually happens in a first consultation."
      )
    ).toBe(true)
    expect(containsUnsupportedExperienceClaim("My clients always tell me the same thing.")).toBe(
      true
    )
    expect(
      containsUnsupportedExperienceClaim(
        "Before a design consultation, notice how you use the room and where the light falls."
      )
    ).toBe(false)
    expect(
      isUnsupportedAutoDraftPost(
        {
          title: "Design philosophy",
          contentPillar: "Design insight",
          caption: "Before color, I look at the light in a room.",
        },
        true
      )
    ).toBe(true)
    expect(
      isUnsupportedAutoDraftPost(
        {
          title: "Behind the consultation",
          contentPillar: "Process peek",
          caption: "A consultation can begin by noticing how the room is used.",
        },
        true
      )
    ).toBe(true)
    expect(
      isUnsupportedAutoDraftPost(
        {
          title: "Light first",
          contentPillar: "Useful lesson",
          caption: "Before choosing color, notice where the light lands in the room.",
        },
        true
      )
    ).toBe(false)
  })

  it("does not treat an empty legacy profile as enough context to draft a month", () => {
    expect(hasSufficientCalendarContext(null)).toBe(false)
    expect(
      hasSufficientCalendarContext({
        business_type: "",
        ideal_audience: "",
        target_audience: "",
        current_situation: "",
        content_goals: "",
      } as any)
    ).toBe(false)
  })

  it("accepts current and legacy profile fields when the facts needed for a plan exist", () => {
    expect(
      hasSufficientCalendarContext({
        business_type: "Interior designer",
        ideal_audience: "First-time homeowners",
        current_situation: "Room design consultations",
      } as any)
    ).toBe(true)
    expect(
      hasSufficientCalendarContext({
        business_type: "Coach",
        target_audience: "Women founders",
        content_goals: "Teach the launch method",
      } as any)
    ).toBe(true)
  })
})
