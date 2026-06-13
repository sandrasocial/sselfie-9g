import { describe, expect, it } from "vitest"

import { summarizeStudioMemberHealth } from "@/lib/admin/studio-member-health-summary"

describe("summarizeStudioMemberHealth", () => {
  it("counts training, generation paths, and smoke-test risk separately", () => {
    const report = summarizeStudioMemberHealth([
      {
        id: "member-1",
        email: "active@example.com",
        member_since: "2026-01-01T00:00:00.000Z",
        training_started: true,
        training_completed: true,
        training_completed_at: "2026-01-02T00:00:00.000Z",
        classic_generations: 3,
        quick_generations: 5,
        pro_generations: 1,
        ai_generations: 6,
        last_generated_at: "2026-01-03T00:00:00.000Z",
      },
      {
        id: "member-2",
        email: "quiet@example.com",
        member_since: "2026-01-04T00:00:00.000Z",
        training_started: false,
        training_completed: false,
        training_completed_at: null,
        classic_generations: 0,
        quick_generations: 0,
        pro_generations: 0,
        ai_generations: 0,
        last_generated_at: null,
      },
      {
        id: "member-3",
        email: "codex-member@sselfie-smoke.test",
        member_since: "2026-01-05T00:00:00.000Z",
        training_started: false,
        training_completed: false,
        training_completed_at: null,
        classic_generations: 0,
        quick_generations: 0,
        pro_generations: 0,
        ai_generations: 0,
        last_generated_at: null,
      },
    ])

    expect(report.totalMembers).toBe(3)
    expect(report.trainingStarted).toBe(1)
    expect(report.trainingCompleted).toBe(1)
    expect(report.classicGenerators).toBe(1)
    expect(report.quickPhotoGenerators).toBe(1)
    expect(report.proGenerators).toBe(1)
    expect(report.everGenerated).toBe(1)
    expect(report.neverGenerated).toBe(2)
    expect(report.neverGeneratedRealMembers).toBe(1)
    expect(report.neverGeneratedMembers.map((member) => member.email)).toEqual([
      "quiet@example.com",
      "codex-member@sselfie-smoke.test",
    ])
  })
})
