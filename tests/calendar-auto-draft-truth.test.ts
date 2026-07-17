import { describe, expect, it } from "vitest"
import { buildAutoDraftPrompt } from "@/lib/feed-planner/auto-draft"

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
      "Never invent facts, numbers, customer results, personal history, testimonials, pricing, timelines, or proof",
    )
    expect(prompt.system).toContain("Use only facts explicitly present in the context")
    expect(prompt.system).toContain(
      "Do not write first-person autobiography, quantified proof, or a client story unless the supplied context supports it",
    )
    expect(prompt.userMessage).toContain(
      "Use observations, useful how-to guidance, thoughtful questions, and editable caption structures",
    )
    expect(prompt.userMessage).toContain("Do not fill missing context with plausible details")
  })
})
