export type MayaJob =
  | "decide_post"
  | "create_content"
  | "finish_calendar_post"
  | "improve_grid"
  | "learn_next"

export type MayaSurface = "create" | "calendar" | "gallery" | "learn" | "account"

export interface MayaContextEnvelope {
  schemaVersion: 1
  taskId: string
  job: MayaJob
  surface: MayaSurface
  feedId?: number
  postId?: number
  postPosition?: number
  lessonRef?: { courseId: number; lessonId: number }
  inspirationRef?: { assetId?: string; url?: string; explicitlyCarried: boolean }
  startedAt: string
}

const JOBS: MayaJob[] = [
  "decide_post",
  "create_content",
  "finish_calendar_post",
  "improve_grid",
  "learn_next",
]
const SURFACES: MayaSurface[] = ["create", "calendar", "gallery", "learn", "account"]
const MAX_TASK_ID_LENGTH = 160
const MAX_URL_LENGTH = 4096

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

function cleanTaskId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const cleaned = value.trim()
  if (!cleaned || cleaned.length > MAX_TASK_ID_LENGTH) return null
  return cleaned
}

function cleanStartedAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

function cleanInspirationRef(value: unknown): MayaContextEnvelope["inspirationRef"] {
  if (!value || typeof value !== "object") return undefined
  const inspiration = value as Record<string, unknown>
  const explicitlyCarried = inspiration.explicitlyCarried === true
  if (!explicitlyCarried) return { explicitlyCarried: false }

  const assetId =
    typeof inspiration.assetId === "string" && inspiration.assetId.trim()
      ? inspiration.assetId.trim().slice(0, 160)
      : undefined
  const url =
    typeof inspiration.url === "string" &&
    inspiration.url.startsWith("https://") &&
    inspiration.url.length <= MAX_URL_LENGTH
      ? inspiration.url
      : undefined
  if (!assetId && !url) return { explicitlyCarried: true }
  return { ...(assetId ? { assetId } : {}), ...(url ? { url } : {}), explicitlyCarried: true }
}

export function sanitizeMayaContextEnvelope(value: unknown): MayaContextEnvelope | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  if (raw.schemaVersion !== 1) return null
  const taskId = cleanTaskId(raw.taskId)
  const startedAt = cleanStartedAt(raw.startedAt)
  if (!taskId || !startedAt) return null
  if (!JOBS.includes(raw.job as MayaJob) || !SURFACES.includes(raw.surface as MayaSurface)) {
    return null
  }

  const job = raw.job as MayaJob
  const surface = raw.surface as MayaSurface
  const feedId = positiveInteger(raw.feedId) ? raw.feedId : undefined
  const postId = positiveInteger(raw.postId) ? raw.postId : undefined
  const postPosition = positiveInteger(raw.postPosition) ? raw.postPosition : undefined

  if (job === "finish_calendar_post" && (surface !== "calendar" || !feedId || !postId)) {
    return null
  }
  if ((job === "decide_post" || job === "improve_grid") && surface !== "calendar") return null
  if (job === "learn_next" && surface !== "learn") return null

  const rawLesson =
    raw.lessonRef && typeof raw.lessonRef === "object"
      ? (raw.lessonRef as Record<string, unknown>)
      : null
  const lessonRef =
    rawLesson && positiveInteger(rawLesson.courseId) && positiveInteger(rawLesson.lessonId)
      ? { courseId: rawLesson.courseId, lessonId: rawLesson.lessonId }
      : undefined

  return {
    schemaVersion: 1,
    taskId,
    job,
    surface,
    ...(feedId ? { feedId } : {}),
    ...(postId ? { postId } : {}),
    ...(postPosition ? { postPosition } : {}),
    ...(lessonRef ? { lessonRef } : {}),
    ...(raw.inspirationRef ? { inspirationRef: cleanInspirationRef(raw.inspirationRef) } : {}),
    startedAt,
  }
}

export function createMayaContextEnvelope(
  value: Omit<MayaContextEnvelope, "schemaVersion">
): MayaContextEnvelope {
  const context = sanitizeMayaContextEnvelope({ ...value, schemaVersion: 1 })
  if (!context) throw new Error("Invalid Maya context envelope")
  return context
}

export function newMayaTaskId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return `maya-task-${uuid}`
  return `maya-task-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export function calendarMayaTaskId(feedId: number, postId: number): string {
  if (!positiveInteger(feedId) || !positiveInteger(postId)) {
    throw new Error("A Calendar Maya task requires a valid feed and post")
  }
  return `maya-calendar-v1-${feedId}-${postId}`
}

export function mayaContextMatchesCalendarPost(
  context: MayaContextEnvelope | null | undefined,
  feedId: number,
  postId: number
): boolean {
  return Boolean(
    context &&
      context.job === "finish_calendar_post" &&
      context.surface === "calendar" &&
      context.feedId === feedId &&
      context.postId === postId &&
      context.taskId === calendarMayaTaskId(feedId, postId)
  )
}
