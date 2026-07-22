import "server-only"

import { createHash } from "node:crypto"

import { sql } from "@/lib/db/client"
import type { MethodDepth } from "@/lib/maya/sselfie-method-content"
import { RITUAL_STEP_INSIGHTS } from "@/lib/maya/sselfie-method-content"
import {
  COURSE_KNOWLEDGE,
  METHOD_SEQUENCE,
  SANDRA_CORE_BELIEFS,
} from "@/lib/maya/sandra-teaching-knowledge"
import {
  BRANDED_BY_SSELFIE_TRANSCRIPT_CORPUS,
  SSELFIE_FLAGSHIP_METHOD_CORPUS,
} from "./curated-corpus"
import type { MayaGuidanceRequest, MayaGuidanceSourceRef } from "./types"

export interface AcademyGuidanceRow {
  courseId: number
  productId: string | null
  lessonId: number
  lessonNumber?: number
  lessonTitle: string
  content: unknown
}

export interface MayaGuidanceSource extends MayaGuidanceSourceRef {
  id: string
  text: string
  productId?: string
  field: string
  sourceDocumentId?: string
  sourceUpdatedAt?: string
}

export interface RankedMayaGuidanceSources {
  fragments: MayaGuidanceSource[]
  hasQuestionMatch: boolean
}

export type LessonProgressStatus = "not_started" | "in_progress" | "completed"

const MAX_FRAGMENT_LENGTH = 900
const MAX_RETRIEVED_FRAGMENTS = 4
const STALE_OR_OFF_BRAND_GUIDANCE_PHRASES = [
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
] as const
const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "could",
  "from",
  "have",
  "help",
  "into",
  "just",
  "lesson",
  "maya",
  "need",
  "should",
  "that",
  "their",
  "there",
  "these",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your",
])

function stableVersion(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16)
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const clean = value.replace(/\s+/g, " ").trim()
  return clean || null
}

function isBrandAlignedGuidanceText(row: AcademyGuidanceRow, text: string): boolean {
  if (row.productId !== "branded_by_sselfie") return true
  const normalized = text.toLowerCase()
  return !STALE_OR_OFF_BRAND_GUIDANCE_PHRASES.some(phrase => normalized.includes(phrase))
}

function textArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(cleanText).filter((item): item is string => Boolean(item))
}

function textRecordValues(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  return Object.values(value as Record<string, unknown>)
    .map(cleanText)
    .filter((item): item is string => Boolean(item))
}

function chunks(text: string): string[] {
  if (text.length <= MAX_FRAGMENT_LENGTH) return [text]
  const result: string[] = []
  let offset = 0
  while (offset < text.length) {
    const hardEnd = Math.min(text.length, offset + MAX_FRAGMENT_LENGTH)
    const candidate = text.slice(offset, hardEnd)
    const sentenceEnd = candidate.lastIndexOf(". ")
    const end = sentenceEnd > 500 ? offset + sentenceEnd + 1 : hardEnd
    result.push(text.slice(offset, end).trim())
    if (end >= text.length) break
    offset = Math.max(offset + 1, end - 100)
  }
  return result.filter(Boolean)
}

function normalizedTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function academySource(
  row: AcademyGuidanceRow,
  field: string,
  text: string,
  index: number,
  kind: MayaGuidanceSource["kind"]
): MayaGuidanceSource {
  const fragment = text.slice(0, MAX_FRAGMENT_LENGTH)
  return {
    id: `lesson:${row.lessonId}:${field}:${index}`,
    kind,
    courseId: row.courseId,
    lessonId: row.lessonId,
    title: row.lessonTitle,
    version: stableVersion(fragment),
    text: fragment,
    ...(row.productId ? { productId: row.productId } : {}),
    field,
  }
}

export function normalizeAcademyGuidanceSources(rows: AcademyGuidanceRow[]): MayaGuidanceSource[] {
  const sources: MayaGuidanceSource[] = []
  for (const row of rows) {
    if (!row.content || typeof row.content !== "object" || Array.isArray(row.content)) continue
    const content = row.content as Record<string, unknown>
    const scalarFields: Array<[string, MayaGuidanceSource["kind"]]> = [
      ["maya_context", "lesson"],
      ["transcript_summary", "transcript"],
      ["workbook_focus", "lesson"],
      ["reflection_prompt", "lesson"],
    ]
    for (const [field, kind] of scalarFields) {
      const text = cleanText(content[field])
      if (text && isBrandAlignedGuidanceText(row, text)) {
        sources.push(academySource(row, field, text, 0, kind))
      }
    }

    for (const [index, text] of textArray(content.key_takeaways).entries()) {
      if (isBrandAlignedGuidanceText(row, text)) {
        sources.push(academySource(row, "key_takeaways", text, index, "lesson"))
      }
    }
    const actionValues = [
      ...textRecordValues(content.action_step),
      ...textArray(content.action_steps),
    ]
    for (const [index, text] of actionValues.entries()) {
      if (isBrandAlignedGuidanceText(row, text)) {
        sources.push(academySource(row, "action_step", text, index, "lesson"))
      }
    }
    const workbookPrompts = [
      ...textArray(content.workbook_prompts),
      ...textArray(content.reflection_prompts),
    ]
    for (const [index, text] of workbookPrompts.entries()) {
      if (isBrandAlignedGuidanceText(row, text)) {
        sources.push(academySource(row, "workbook_prompt", text, index, "lesson"))
      }
    }

    const transcript =
      cleanText(content.full_transcript) ??
      cleanText(content.transcript_text) ??
      cleanText(content.transcript)
    if (transcript) {
      for (const [index, text] of chunks(transcript).entries()) {
        if (isBrandAlignedGuidanceText(row, text)) {
          sources.push(academySource(row, "full_transcript", text, index, "transcript"))
        }
      }
    } else {
      const lessonTitle = normalizedTitle(row.lessonTitle)
      const curated = BRANDED_BY_SSELFIE_TRANSCRIPT_CORPUS.find(
        entry =>
          entry.productId === row.productId &&
          (entry.lessonNumber === row.lessonNumber ||
            [entry.lessonTitle, ...(entry.lessonTitleAliases ?? [])].some(
              title => normalizedTitle(title) === lessonTitle
            ))
      )
      if (curated) {
        for (const [index, text] of curated.fragments.entries()) {
          sources.push({
            ...academySource(row, "curated_transcript", text, index, "transcript"),
            sourceDocumentId: curated.sourceDocumentId,
            sourceUpdatedAt: curated.sourceUpdatedAt,
          })
        }
      }
    }
  }
  return sources
}

function methodSource(
  id: string,
  kind: "method" | "course",
  title: string,
  text: string,
  field: string
): MayaGuidanceSource {
  return {
    id,
    kind,
    title,
    text,
    version: stableVersion(text),
    field,
  }
}

export function buildSandraMethodGuidanceSources(
  methodDepth: MethodDepth = "teaser"
): MayaGuidanceSource[] {
  const sources: MayaGuidanceSource[] = SANDRA_CORE_BELIEFS.map((text, index) =>
    methodSource(`method:belief:${index}`, "method", "Sandra's SSELFIE method", text, "belief")
  )

  for (const source of SSELFIE_FLAGSHIP_METHOD_CORPUS) {
    sources.push({
      ...methodSource(source.id, "method", source.title, source.text, "flagship_method"),
      sourceDocumentId: source.sourceDocumentId,
      sourceUpdatedAt: source.sourceUpdatedAt,
    })
  }

  for (const insight of RITUAL_STEP_INSIGHTS) {
    const text = methodDepth === "teaser" ? insight.teaser : insight.full
    sources.push(
      methodSource(
        `method:ritual:${insight.step}:${methodDepth}`,
        "method",
        `Weekly ritual: ${insight.step.replaceAll("_", " ")}`,
        text,
        "ritual_step"
      )
    )
  }

  for (const step of METHOD_SEQUENCE) {
    sources.push(
      methodSource(
        `method:sequence:${step.step}`,
        "method",
        step.name,
        step.summary,
        "method_sequence"
      )
    )
  }

  for (const [courseKey, knowledge] of Object.entries(COURSE_KNOWLEDGE)) {
    const title = courseKey.replaceAll("_", " ")
    sources.push(
      methodSource(`course:${courseKey}:promise`, "course", title, knowledge.promise, "promise"),
      methodSource(
        `course:${courseKey}:principle`,
        "course",
        title,
        knowledge.keyPrinciple,
        "key_principle"
      )
    )
    const canRetrieveCourseTeaching =
      methodDepth !== "teaser" &&
      (courseKey !== "studio_weekly" || methodDepth === "full_plus_execution")
    if (canRetrieveCourseTeaching) {
      for (const [index, text] of knowledge.teaches.entries()) {
        sources.push(
          methodSource(`course:${courseKey}:teaches:${index}`, "course", title, text, "teaches")
        )
      }
    }
  }
  return sources
}

function tokens(value: string | undefined): Set<string> {
  if (!value) return new Set()
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter(token => token.length >= 4 && !STOP_WORDS.has(token))
  )
}

function overlapCount(needles: Set<string>, source: MayaGuidanceSource): number {
  if (!needles.size) return 0
  const haystack = `${source.title} ${source.text}`.toLowerCase()
  let count = 0
  for (const token of needles) if (haystack.includes(token)) count += 1
  return count
}

const JOB_TERMS: Record<MayaGuidanceRequest["job"], string> = {
  decide_post: "post content story caption audience teach visibility",
  improve_grid: "brand visual grid feed consistency theme plan",
  learn_next: "learn lesson next action confidence brand content visibility",
}

export function rankMayaGuidanceSources(input: {
  sources: MayaGuidanceSource[]
  request: MayaGuidanceRequest
  accessibleProductIds: ReadonlySet<string>
  lessonProgress: ReadonlyMap<number, LessonProgressStatus>
}): RankedMayaGuidanceSources {
  const eligible = input.sources.filter(
    source => !source.productId || input.accessibleProductIds.has(source.productId)
  )
  const questionTokens = tokens(input.request.question)
  const goalTokens = tokens(input.request.memberGoal)
  const jobTokens = tokens(JOB_TERMS[input.request.job])
  const hasQuestionMatch =
    questionTokens.size === 0 || eligible.some(source => overlapCount(questionTokens, source) > 0)

  const scored = eligible.map(source => {
    let score = overlapCount(questionTokens, source) * 80
    score += overlapCount(goalTokens, source) * 45
    score += overlapCount(jobTokens, source) * 8
    if (input.request.lessonRef?.lessonId === source.lessonId) score += 1000
    else if (input.request.lessonRef?.courseId === source.courseId) score += 200
    if (source.lessonId) {
      const status = input.lessonProgress.get(source.lessonId)
      if (status === "in_progress") score += 55
      else if (status === "not_started" || !status) score += 25
      else if (status === "completed") score -= 15
    }
    if (source.field === "maya_context") score += 18
    if (source.field === "action_step") score += 12
    return { source, score }
  })

  scored.sort(
    (left, right) => right.score - left.score || left.source.id.localeCompare(right.source.id)
  )
  const topRanked = scored.slice(0, MAX_RETRIEVED_FRAGMENTS)
  if (input.request.job === "learn_next" && !topRanked.some(item => item.source.lessonId)) {
    const bestOwnedLesson = scored.find(item => item.source.lessonId)
    if (bestOwnedLesson) {
      topRanked.splice(
        0,
        topRanked.length,
        bestOwnedLesson,
        ...topRanked
          .filter(item => item.source.id !== bestOwnedLesson.source.id)
          .slice(0, MAX_RETRIEVED_FRAGMENTS - 1)
      )
    }
  }
  return {
    fragments: topRanked.map(item => item.source),
    hasQuestionMatch,
  }
}

export async function loadMayaGuidanceSources(
  userId: string,
  options: { methodDepth: MethodDepth }
): Promise<{
  sources: MayaGuidanceSource[]
  lessonProgress: Map<number, LessonProgressStatus>
}> {
  const [lessonRows, progressRows] = await Promise.all([
    sql`
      SELECT
        c.id AS course_id,
        c.product_id,
        l.id AS lesson_id,
        l.lesson_number,
        l.title AS lesson_title,
        l.content
      FROM academy_courses c
      JOIN academy_lessons l ON l.course_id = c.id
      WHERE c.status = 'published'
      ORDER BY c.order_index ASC, l.lesson_number ASC
    `,
    sql`
      SELECT lesson_id, status
      FROM user_lesson_progress
      WHERE user_id = ${userId}
    `,
  ])

  const academyRows: AcademyGuidanceRow[] = lessonRows.map(row => ({
    courseId: Number(row.course_id),
    productId: typeof row.product_id === "string" ? row.product_id : null,
    lessonId: Number(row.lesson_id),
    lessonNumber: Number(row.lesson_number),
    lessonTitle: String(row.lesson_title),
    content: row.content,
  }))
  const lessonProgress = new Map<number, LessonProgressStatus>()
  for (const row of progressRows) {
    if (
      Number.isInteger(Number(row.lesson_id)) &&
      ["not_started", "in_progress", "completed"].includes(String(row.status))
    ) {
      lessonProgress.set(Number(row.lesson_id), String(row.status) as LessonProgressStatus)
    }
  }

  return {
    sources: [
      ...buildSandraMethodGuidanceSources(options.methodDepth),
      ...normalizeAcademyGuidanceSources(academyRows),
    ],
    lessonProgress,
  }
}
