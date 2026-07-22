import type { MayaActionDescriptor } from "@/lib/app-v3/maya/action-protocol"

export type MayaGuidanceJob = "decide_post" | "improve_grid" | "learn_next"

export interface MayaGuidanceRequest {
  taskId: string
  job: MayaGuidanceJob
  question?: string
  lessonRef?: { courseId: number; lessonId: number }
  memberGoal?: string
}

export interface MayaGuidanceSourceRef {
  kind: "method" | "course" | "lesson" | "transcript"
  courseId?: number
  lessonId?: number
  title: string
  version: string
}

export interface MayaGuidanceResult {
  recommendation: string
  reason: string
  sourceRefs: MayaGuidanceSourceRef[]
  nextAction: MayaActionDescriptor
}

const TASK_ID = /^[a-zA-Z0-9:_-]{8,160}$/
const JOBS = new Set<MayaGuidanceJob>(["decide_post", "improve_grid", "learn_next"])

function optionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined
  const clean = value.trim()
  return clean ? clean.slice(0, maxLength) : undefined
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

export function sanitizeMayaGuidanceRequest(value: unknown): MayaGuidanceRequest | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const taskId = typeof raw.taskId === "string" ? raw.taskId.trim() : ""
  if (!TASK_ID.test(taskId) || !JOBS.has(raw.job as MayaGuidanceJob)) return null

  const rawLesson =
    raw.lessonRef && typeof raw.lessonRef === "object"
      ? (raw.lessonRef as Record<string, unknown>)
      : null
  const lessonRef =
    rawLesson && positiveInteger(rawLesson.courseId) && positiveInteger(rawLesson.lessonId)
      ? { courseId: rawLesson.courseId, lessonId: rawLesson.lessonId }
      : undefined

  return {
    taskId,
    job: raw.job as MayaGuidanceJob,
    ...(optionalText(raw.question, 500) ? { question: optionalText(raw.question, 500) } : {}),
    ...(lessonRef ? { lessonRef } : {}),
    ...(optionalText(raw.memberGoal, 240) ? { memberGoal: optionalText(raw.memberGoal, 240) } : {}),
  }
}
