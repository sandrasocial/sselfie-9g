// @vitest-environment node

import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  buildSandraMethodGuidanceSources,
  normalizeAcademyGuidanceSources,
  rankMayaGuidanceSources,
  type AcademyGuidanceRow,
} from "@/lib/app-v3/maya/guidance/source-registry"

const rows: AcademyGuidanceRow[] = [
  {
    courseId: 1,
    productId: "branded_by_sselfie",
    lessonId: 10,
    lessonTitle: "Post Before You Feel Ready",
    content: {
      maya_context: "Confidence is built by publishing before everything feels perfect.",
      transcript_summary: "Sandra explains why showing up creates confidence, not the reverse.",
      key_takeaways: ["Post for your people, not for approval."],
      action_step: { bold_move: "Publish one useful post this week." },
      reflection_prompt: "What are you waiting to feel before you post?",
    },
  },
  {
    courseId: 3,
    productId: "editing_masterclass",
    lessonId: 19,
    lessonTitle: "Editing with Hypic App",
    content: {
      key_takeaways: ["Small adjustments keep the edit recognizable."],
      transcript_text: "Use restrained changes. ".repeat(120),
    },
  },
]

describe("Maya Sandra-knowledge retrieval", () => {
  it("uses the existing entitlement depth for Sandra's method content", () => {
    const teaser = buildSandraMethodGuidanceSources("teaser")
    const full = buildSandraMethodGuidanceSources("full")

    expect(teaser.some(source => source.text.includes("Your energy this week shapes"))).toBe(true)
    expect(
      teaser.some(source => source.text.includes("The SSELFIE method starts with honesty"))
    ).toBe(false)
    expect(full.some(source => source.text.includes("The SSELFIE method starts with honesty"))).toBe(
      true
    )
    expect(full.length).toBeGreaterThan(teaser.length)
    expect(full.some(source => source.text.includes("The weekly ritual — energy check"))).toBe(
      false
    )
    expect(
      buildSandraMethodGuidanceSources("full_plus_execution").some(source =>
        source.text.includes("The weekly ritual — energy check")
      )
    ).toBe(true)
  })

  it("normalizes every owned teaching field into stable versioned fragments", () => {
    const first = normalizeAcademyGuidanceSources(rows)
    const second = normalizeAcademyGuidanceSources(rows)

    expect(first.length).toBeGreaterThan(6)
    expect(first.map(source => source.version)).toEqual(second.map(source => source.version))
    expect(first.every(source => /^[a-f0-9]{16}$/.test(source.version))).toBe(true)
    expect(first.some(source => source.kind === "transcript" && source.lessonId === 19)).toBe(true)
    expect(first.every(source => source.text.length <= 900)).toBe(true)
  })

  it("ranks an explicit owned lesson first and returns no more than four fragments", () => {
    const ranked = rankMayaGuidanceSources({
      sources: normalizeAcademyGuidanceSources(rows),
      request: {
        taskId: "maya-task-learning-123",
        job: "learn_next",
        question: "How do I post before I feel confident?",
        lessonRef: { courseId: 1, lessonId: 10 },
      },
      accessibleProductIds: new Set(["branded_by_sselfie"]),
      lessonProgress: new Map([[10, "in_progress"]]),
    })

    expect(ranked.fragments).toHaveLength(4)
    expect(ranked.fragments[0]?.lessonId).toBe(10)
    expect(ranked.fragments.every(source => source.productId === "branded_by_sselfie")).toBe(true)
    expect(ranked.hasQuestionMatch).toBe(true)
  })

  it("always includes an owned lesson when Learn asks for the next useful thing", () => {
    const methodSources = Array.from({ length: 5 }, (_, index) => ({
      id: `method:post:${index}`,
      kind: "method" as const,
      title: "Post content lesson",
      version: `method-version-${index}`,
      text: "Learn the next useful post content action for your visibility.",
      field: "belief",
    }))
    const lessonSources = normalizeAcademyGuidanceSources(rows.slice(0, 1))

    const ranked = rankMayaGuidanceSources({
      sources: [...methodSources, ...lessonSources],
      request: {
        taskId: "maya-task-learning-owned-lesson",
        job: "learn_next",
        memberGoal: "I don't know what to post",
      },
      accessibleProductIds: new Set(["branded_by_sselfie"]),
      lessonProgress: new Map([[10, "not_started"]]),
    })

    expect(ranked.fragments.some(source => source.lessonId === 10)).toBe(true)
  })

  it("never exposes lesson or transcript text for an unowned product", () => {
    const ranked = rankMayaGuidanceSources({
      sources: normalizeAcademyGuidanceSources(rows),
      request: {
        taskId: "maya-task-learning-456",
        job: "learn_next",
        question: "Tell me the Hypic lesson",
        lessonRef: { courseId: 3, lessonId: 19 },
      },
      accessibleProductIds: new Set(["branded_by_sselfie"]),
      lessonProgress: new Map(),
    })

    expect(ranked.fragments.every(source => source.productId !== "editing_masterclass")).toBe(true)
    expect(ranked.hasQuestionMatch).toBe(false)
  })
})
