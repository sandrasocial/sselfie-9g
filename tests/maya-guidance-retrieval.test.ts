// @vitest-environment node

import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  buildSandraMethodGuidanceSources,
  normalizeAcademyGuidanceSources,
  rankMayaGuidanceSources,
  type AcademyGuidanceRow,
} from "@/lib/app-v3/maya/guidance/source-registry"
import {
  BRANDED_BY_SSELFIE_TRANSCRIPT_CORPUS,
  SSELFIE_FLAGSHIP_METHOD_CORPUS,
} from "@/lib/app-v3/maya/guidance/curated-corpus"

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
  it("ships one brand-aligned transcript source for every live Branded by SSELFIE lesson", () => {
    expect(BRANDED_BY_SSELFIE_TRANSCRIPT_CORPUS).toHaveLength(14)
    expect(
      BRANDED_BY_SSELFIE_TRANSCRIPT_CORPUS.every(
        entry =>
          entry.productId === "branded_by_sselfie" &&
          entry.lessonNumber >= 1 &&
          entry.lessonNumber <= 14 &&
          entry.sourceDocumentId === "1Skek7ezqeX0RaDtmTtEMb2CASE_RmRmmnMZm3zjQ6OU" &&
          entry.fragments.length >= 2
      )
    ).toBe(true)

    const allTeaching = [
      ...BRANDED_BY_SSELFIE_TRANSCRIPT_CORPUS.flatMap(entry => entry.fragments),
      ...SSELFIE_FLAGSHIP_METHOD_CORPUS.map(entry => entry.text),
    ]
      .join(" ")
      .toLowerCase()

    for (const staleOrOffBrand of [
      "studio.com",
      "today tab",
      "ceo era",
      "unstoppable",
      "go viral",
      "viral results",
      "no one will know",
      "fake photoshoot",
      "look rich",
      "perfect face",
      "flawless skin",
    ]) {
      expect(allTeaching).not.toContain(staleOrOffBrand)
    }
  })

  it("binds curated transcripts to the real Academy lesson instead of exposing a detached corpus", () => {
    const academyRows: AcademyGuidanceRow[] = BRANDED_BY_SSELFIE_TRANSCRIPT_CORPUS.map(
      (entry, index) => ({
        courseId: 1,
        productId: "branded_by_sselfie",
        lessonId: index + 1,
        lessonNumber: entry.lessonNumber,
        lessonTitle: entry.lessonTitle,
        content: {},
      })
    )

    const sources = normalizeAcademyGuidanceSources(academyRows)
    const transcripts = sources.filter(source => source.field === "curated_transcript")

    expect(transcripts.length).toBeGreaterThanOrEqual(28)
    expect(transcripts.every(source => source.courseId === 1 && source.lessonId)).toBe(true)
    expect(
      transcripts.every(
        source =>
          source.productId === "branded_by_sselfie" &&
          source.sourceDocumentId === "1Skek7ezqeX0RaDtmTtEMb2CASE_RmRmmnMZm3zjQ6OU" &&
          /^[a-f0-9]{16}$/.test(source.version)
      )
    ).toBe(true)
  })

  it("keeps stale Academy action steps out of the brand-aligned guidance registry", () => {
    const sources = normalizeAcademyGuidanceSources([
      {
        courseId: 1,
        productId: "branded_by_sselfie",
        lessonId: 2,
        lessonNumber: 2,
        lessonTitle: "Building Unshakable Selfie Confidence",
        content: {
          action_step: {
            legacy_prompt:
              "Post the selfie in the community with: This is the first day of my CEO era. Watch me build something real.",
          },
        },
      },
    ])

    expect(sources.some(source => source.field === "curated_transcript")).toBe(true)
    expect(
      sources
        .map(source => source.text)
        .join(" ")
        .toLowerCase()
    ).not.toContain("ceo era")
  })

  it("does not attach owned transcript text to a similarly named lesson in another product", () => {
    const [entry] = BRANDED_BY_SSELFIE_TRANSCRIPT_CORPUS
    const sources = normalizeAcademyGuidanceSources([
      {
        courseId: 99,
        productId: "editing_masterclass",
        lessonId: 999,
        lessonTitle: entry.lessonTitle,
        content: {},
      },
    ])

    expect(sources.some(source => source.field === "curated_transcript")).toBe(false)
  })

  it("keeps the corpus bound through harmless lesson-title edits and yields to a future full transcript", () => {
    const titleEdited = normalizeAcademyGuidanceSources([
      {
        courseId: 1,
        productId: "branded_by_sselfie",
        lessonId: 8,
        lessonNumber: 8,
        lessonTitle: "Your Instagram First Impression",
        content: {},
      },
    ])
    expect(titleEdited.some(source => source.field === "curated_transcript")).toBe(true)

    const futureFullTranscript = normalizeAcademyGuidanceSources([
      {
        courseId: 1,
        productId: "branded_by_sselfie",
        lessonId: 8,
        lessonNumber: 8,
        lessonTitle: "Glow Up Your Bio + First Impressions",
        content: { full_transcript: "Future approved full transcript." },
      },
    ])
    expect(futureFullTranscript.some(source => source.field === "curated_transcript")).toBe(false)
    expect(futureFullTranscript.some(source => source.field === "full_transcript")).toBe(true)
  })

  it("retrieves the Still You flagship rule for recognizable AI-photo guidance", () => {
    const ranked = rankMayaGuidanceSources({
      sources: buildSandraMethodGuidanceSources("full"),
      request: {
        taskId: "maya-task-still-you",
        job: "improve_grid",
        question: "How do I make sure an AI photo still looks recognizable and real?",
      },
      accessibleProductIds: new Set(),
      lessonProgress: new Map(),
    })

    expect(ranked.fragments.some(source => source.id === "flagship:still-you")).toBe(true)
  })

  it("retrieves the final Branded lesson for a weekly content plan", () => {
    const academyRows: AcademyGuidanceRow[] = BRANDED_BY_SSELFIE_TRANSCRIPT_CORPUS.map(
      (entry, index) => ({
        courseId: 1,
        productId: entry.productId,
        lessonId: index + 1,
        lessonNumber: entry.lessonNumber,
        lessonTitle: entry.lessonTitle,
        content: {},
      })
    )
    const ranked = rankMayaGuidanceSources({
      sources: normalizeAcademyGuidanceSources(academyRows),
      request: {
        taskId: "maya-task-weekly-plan",
        job: "decide_post",
        question: "How do I plan one week of posts around my current goal?",
      },
      accessibleProductIds: new Set(["branded_by_sselfie"]),
      lessonProgress: new Map(),
    })

    expect(ranked.fragments.some(source => source.lessonId === 14)).toBe(true)
    expect(ranked.fragments.every(source => source.productId === "branded_by_sselfie")).toBe(true)
  })

  it("uses the existing entitlement depth for Sandra's method content", () => {
    const teaser = buildSandraMethodGuidanceSources("teaser")
    const full = buildSandraMethodGuidanceSources("full")

    expect(teaser.some(source => source.text.includes("Your energy this week shapes"))).toBe(true)
    expect(
      teaser.some(source => source.text.includes("The SSELFIE method starts with honesty"))
    ).toBe(false)
    expect(
      full.some(source => source.text.includes("The SSELFIE method starts with honesty"))
    ).toBe(true)
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
