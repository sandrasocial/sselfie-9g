export const FOUNDER_FEEDBACK_REPORT_TYPES = ["blocked", "confusing", "quality", "idea"] as const

export const FOUNDER_FEEDBACK_STATUSES = [
  "new",
  "reproduced",
  "fixing",
  "tested",
  "deployed",
  "verified",
  "deferred",
] as const

export type FounderFeedbackReportType = (typeof FOUNDER_FEEDBACK_REPORT_TYPES)[number]
export type FounderFeedbackStatus = (typeof FOUNDER_FEEDBACK_STATUSES)[number]

export type FounderFeedbackMessageSummary = {
  role: "user" | "assistant"
  text: string
}

export type FounderFeedbackContext = {
  currentPath?: string | null
  surface?: string | null
  taskId?: string | null
  job?: string | null
  chatId?: string | null
  outputFormat?: string | null
  feedId?: string | null
  postId?: string | null
  postPosition?: number | null
  courseId?: string | null
  lessonId?: string | null
  viewport?: { width: number; height: number } | null
  recentMessages?: FounderFeedbackMessageSummary[]
  capturedAt?: string | null
  userAgent?: string | null
  [key: string]: unknown
}

export type FounderFeedbackPayload = {
  clientReportId: string
  reportType: FounderFeedbackReportType
  message: string
  context: FounderFeedbackContext
}

const REPORT_TYPE_LABELS: Record<FounderFeedbackReportType, string> = {
  blocked: "Blocked",
  confusing: "Confusing",
  quality: "Not good enough",
  idea: "Idea",
}

const STATUS_LABELS: Record<FounderFeedbackStatus, string> = {
  new: "Received",
  reproduced: "Understood",
  fixing: "Being fixed",
  tested: "Testing the fix",
  deployed: "Ready to retest",
  verified: "Fixed",
  deferred: "Saved for later",
}

const STATUS_TRANSITIONS: Record<FounderFeedbackStatus, FounderFeedbackStatus[]> = {
  new: ["reproduced", "fixing", "deferred"],
  reproduced: ["fixing", "deferred"],
  fixing: ["tested", "deferred"],
  tested: ["fixing", "deployed"],
  deployed: ["new", "fixing", "verified"],
  verified: ["new"],
  deferred: ["new", "reproduced", "fixing"],
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const cleaned = value.replace(/\0/g, "").trim()
  if (!cleaned) return null
  return cleaned.slice(0, maxLength)
}

function cleanNullableString(value: unknown, maxLength: number): string | null {
  if (value == null || value === "") return null
  return cleanString(value, maxLength)
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  const integer = Math.round(value)
  return integer >= min && integer <= max ? integer : null
}

function messageTextFromUnknown(message: unknown): FounderFeedbackMessageSummary | null {
  if (!message || typeof message !== "object") return null
  const candidate = message as {
    role?: unknown
    content?: unknown
    parts?: unknown
    text?: unknown
  }
  if (candidate.role !== "user" && candidate.role !== "assistant") return null

  const parts = Array.isArray(candidate.parts) ? candidate.parts : []
  const partText = parts
    .filter((part): part is { type: string; text: string } =>
      Boolean(
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "text" &&
        typeof (part as { text?: unknown }).text === "string"
      )
    )
    .map(part => part.text)
    .join("\n")
  const contentText = typeof candidate.content === "string" ? candidate.content : ""
  const directText = typeof candidate.text === "string" ? candidate.text : ""
  const text = cleanString(partText || contentText || directText, 1200)
  return text ? { role: candidate.role, text } : null
}

export function summarizeFounderFeedbackMessages(
  messages: unknown
): FounderFeedbackMessageSummary[] {
  if (!Array.isArray(messages)) return []
  return messages
    .map(messageTextFromUnknown)
    .filter((message): message is FounderFeedbackMessageSummary => Boolean(message))
    .slice(-6)
}

function normalizeContext(value: unknown): FounderFeedbackContext {
  const context = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const viewportInput =
    context.viewport && typeof context.viewport === "object"
      ? (context.viewport as Record<string, unknown>)
      : null
  const width = cleanInteger(viewportInput?.width, 200, 10000)
  const height = cleanInteger(viewportInput?.height, 200, 10000)

  return {
    currentPath: cleanNullableString(context.currentPath, 500),
    surface: cleanNullableString(context.surface, 60),
    taskId: cleanNullableString(context.taskId, 160),
    job: cleanNullableString(context.job, 80),
    chatId: cleanNullableString(context.chatId, 160),
    outputFormat: cleanNullableString(context.outputFormat, 60),
    feedId: cleanNullableString(context.feedId, 120),
    postId: cleanNullableString(context.postId, 120),
    postPosition: cleanInteger(context.postPosition, 1, 10000),
    courseId: cleanNullableString(context.courseId, 160),
    lessonId: cleanNullableString(context.lessonId, 160),
    viewport: width && height ? { width, height } : null,
    recentMessages: summarizeFounderFeedbackMessages(context.recentMessages),
    capturedAt: cleanNullableString(context.capturedAt, 80),
    userAgent: cleanNullableString(context.userAgent, 500),
  }
}

export function normalizeFounderFeedbackPayload(input: unknown): FounderFeedbackPayload | null {
  if (!input || typeof input !== "object") return null
  const candidate = input as Record<string, unknown>
  const clientReportId = cleanString(candidate.clientReportId, 160)
  const reportType = cleanString(candidate.reportType, 40)
  const message = cleanString(candidate.message, 5000)

  if (
    !clientReportId ||
    !message ||
    !reportType ||
    !FOUNDER_FEEDBACK_REPORT_TYPES.includes(reportType as FounderFeedbackReportType)
  ) {
    return null
  }

  if (typeof candidate.message === "string" && candidate.message.trim().length > 5000) return null

  return {
    clientReportId,
    reportType: reportType as FounderFeedbackReportType,
    message,
    context: normalizeContext(candidate.context),
  }
}

export function founderFeedbackReportTypeLabel(type: FounderFeedbackReportType): string {
  return REPORT_TYPE_LABELS[type]
}

export function founderFeedbackStatusLabel(status: unknown): string {
  if (typeof status !== "string" || !(status in STATUS_LABELS)) return "Received"
  return STATUS_LABELS[status as FounderFeedbackStatus]
}

export function isFounderFeedbackStatus(value: unknown): value is FounderFeedbackStatus {
  return (
    typeof value === "string" && FOUNDER_FEEDBACK_STATUSES.includes(value as FounderFeedbackStatus)
  )
}

export function canTransitionFounderFeedbackStatus(
  current: FounderFeedbackStatus,
  next: FounderFeedbackStatus
): boolean {
  return current === next || STATUS_TRANSITIONS[current].includes(next)
}

export function buildFounderFeedbackSubject(
  reportType: FounderFeedbackReportType,
  message: string
): string {
  const summary = message.replace(/\s+/g, " ").trim().slice(0, 110)
  return `Maya test · ${founderFeedbackReportTypeLabel(reportType)} · ${summary}`
}

export function feedbackTypeForFounderReport(
  reportType: FounderFeedbackReportType
): "bug" | "feature" {
  return reportType === "idea" ? "feature" : "bug"
}
