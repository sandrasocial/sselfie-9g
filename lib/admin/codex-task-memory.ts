import "server-only"

import { sql } from "@/lib/db/client"

export type CodexTaskStatus = "fix_next" | "watching" | "done" | "paused"

export type CodexTaskMemoryItem = {
  key: string
  title: string
  owner: "Codex" | "Sandra" | "Claude/Codex"
  status: CodexTaskStatus
  why: string
  nextStep: string
  signal: string
  liveIssue: boolean
  completedAt: string
  updatedAt: string
}

type StoredCodexTask = Partial<CodexTaskMemoryItem> & {
  key?: string
}

type CodexTaskReportLike = {
  eventCounts: {
    aiPromptAccessOpens: number
    freeToVaultClicks: number
    checkoutStarts: number
    recoverySends: number
  }
  igCounts: {
    inboundMessages: number
  }
}

const TASK_MEMORY_CREATED_BY = "admin:morning-board-codex-task-memory"
const TASK_MEMORY_TITLE = "SSELFIE Morning Board Codex Task Memory"
const STATUSES: CodexTaskStatus[] = ["fix_next", "watching", "done", "paused"]

function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function normalizeStatus(value: unknown): CodexTaskStatus | null {
  return STATUSES.includes(value as CodexTaskStatus) ? (value as CodexTaskStatus) : null
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function defaultTasks(report: CodexTaskReportLike): CodexTaskMemoryItem[] {
  const now = new Date().toISOString()
  const freeBridgeRate = percent(
    report.eventCounts.freeToVaultClicks,
    report.eventCounts.aiPromptAccessOpens
  )
  const bridgeNeedsAttention =
    report.eventCounts.aiPromptAccessOpens > 0 && freeBridgeRate < 12
  const recoveryNeedsAttention =
    report.eventCounts.checkoutStarts >= 3 && report.eventCounts.recoverySends === 0
  const igNeedsAttention = report.igCounts.inboundMessages <= 1

  return [
    {
      key: "morning-board-visual-layer",
      title: "Morning Board visual layer shipped",
      owner: "Codex",
      status: "done",
      why: "Recent Instagram thumbnails, Refresh IG, cover upload, and the 3x3 planner are already live.",
      nextStep: "Leave this quiet unless the visual planner stops saving or syncing.",
      signal: "Done: visual board + planner are in production.",
      liveIssue: false,
      completedAt: now,
      updatedAt: now,
    },
    {
      key: "prompt-vault-checkout-attribution",
      title: "Free preview checkout attribution shipped",
      owner: "Codex",
      status: recoveryNeedsAttention ? "watching" : "done",
      why: "Free preview checkout links now carry the subscriber token so future abandoned checkouts can be tied back to email.",
      nextStep: "Watch the next new checkout starts and confirm recovery emails can send to real addresses.",
      signal: `${report.eventCounts.checkoutStarts} checkout starts · ${report.eventCounts.recoverySends} recovery sends in this window.`,
      liveIssue: recoveryNeedsAttention,
      completedAt: now,
      updatedAt: now,
    },
    {
      key: "free-preview-vault-bridge",
      title: "Free preview to Vault bridge",
      owner: "Claude/Codex",
      status: bridgeNeedsAttention ? "fix_next" : "watching",
      why: "This is the main conversion bridge after someone tests the first prompt.",
      nextStep: bridgeNeedsAttention
        ? "Improve the after-copy upgrade moment and compare the bridge rate tomorrow."
        : "Keep the bridge stable and keep watching the same rate tomorrow.",
      signal: `${freeBridgeRate}% free preview to Vault click rate.`,
      liveIssue: bridgeNeedsAttention,
      completedAt: "",
      updatedAt: now,
    },
    {
      key: "ig-agent-real-events",
      title: "IG agent real event flow",
      owner: "Claude/Codex",
      status: igNeedsAttention ? "watching" : "done",
      why: "The agent is useful only when real comments and DMs flow into the inbox with enough volume.",
      nextStep: igNeedsAttention
        ? "Keep the agent in draft-only mode and verify real Meta events as permissions settle."
        : "Review the inbox for buyer language and aesthetic demand signals.",
      signal: `${report.igCounts.inboundMessages} inbound IG messages/comments in this window.`,
      liveIssue: igNeedsAttention,
      completedAt: igNeedsAttention ? "" : now,
      updatedAt: now,
    },
  ]
}

function normalizeStoredTask(value: StoredCodexTask): StoredCodexTask | null {
  if (!value || typeof value !== "object" || !value.key) return null

  return {
    key: value.key,
    status: normalizeStatus(value.status) || undefined,
    completedAt: toStringValue(value.completedAt),
    updatedAt: toStringValue(value.updatedAt),
  }
}

function mergeTasks(
  report: CodexTaskReportLike,
  storedTasks: StoredCodexTask[]
): CodexTaskMemoryItem[] {
  const storedByKey = new Map(
    storedTasks
      .map(normalizeStoredTask)
      .filter((task): task is StoredCodexTask & { key: string } => Boolean(task?.key))
      .map(task => [task.key, task])
  )

  return defaultTasks(report).map(task => {
    const stored = storedByKey.get(task.key)
    if (!stored) return task

    return {
      ...task,
      status: stored.status || task.status,
      completedAt: stored.completedAt || task.completedAt,
      updatedAt: stored.updatedAt || task.updatedAt,
    }
  })
}

async function loadStoredTasks(): Promise<StoredCodexTask[]> {
  const rows = await sql`
    SELECT calendar_data
    FROM content_calendars
    WHERE created_by = ${TASK_MEMORY_CREATED_BY}
    ORDER BY updated_at DESC
    LIMIT 1
  `

  if (rows.length === 0) return []

  const data = rows[0].calendar_data as { tasks?: unknown } | null
  return Array.isArray(data?.tasks) ? (data.tasks as StoredCodexTask[]) : []
}

async function saveStoredTasks(tasks: CodexTaskMemoryItem[]): Promise<void> {
  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(now.getDate() + 45)

  const payload = {
    version: "morning-board-codex-task-memory-v1",
    tasks,
    updatedAt: now.toISOString(),
  }

  const existing = await sql`
    SELECT id
    FROM content_calendars
    WHERE created_by = ${TASK_MEMORY_CREATED_BY}
    ORDER BY updated_at DESC
    LIMIT 1
  `

  if (existing.length > 0) {
    await sql`
      UPDATE content_calendars
      SET calendar_data = ${JSON.stringify(payload)}::jsonb,
          total_posts = ${tasks.length},
          updated_at = NOW()
      WHERE id = ${existing[0].id}
    `
    return
  }

  await sql`
    INSERT INTO content_calendars (
      title,
      description,
      duration,
      start_date,
      end_date,
      platform,
      calendar_data,
      content_pillars,
      total_posts,
      created_by
    )
    VALUES (
      ${TASK_MEMORY_TITLE},
      ${"Small manual task memory for Sandra's Morning Board."},
      ${"rolling"},
      ${dateOnly(now)},
      ${dateOnly(endDate)},
      ${"admin"},
      ${JSON.stringify(payload)}::jsonb,
      ${["codex", "morning-board", "operations"]},
      ${tasks.length},
      ${TASK_MEMORY_CREATED_BY}
    )
  `
}

export async function getCodexTaskMemory(report: CodexTaskReportLike): Promise<CodexTaskMemoryItem[]> {
  try {
    const storedTasks = await loadStoredTasks()
    return mergeTasks(report, storedTasks)
  } catch (error) {
    console.error("[CodexTaskMemory] Failed to load task memory:", error)
    return defaultTasks(report)
  }
}

export async function updateCodexTaskStatus(
  key: string,
  status: CodexTaskStatus,
  report: CodexTaskReportLike
): Promise<CodexTaskMemoryItem[]> {
  if (!key.trim()) {
    throw new Error("Missing task key.")
  }

  if (!STATUSES.includes(status)) {
    throw new Error("Invalid task status.")
  }

  const now = new Date().toISOString()
  const currentTasks = await getCodexTaskMemory(report)
  const nextTasks = currentTasks.map(task =>
    task.key === key
      ? {
          ...task,
          status,
          completedAt: status === "done" ? now : task.completedAt,
          updatedAt: now,
        }
      : task
  )

  await saveStoredTasks(nextTasks)
  return nextTasks
}
