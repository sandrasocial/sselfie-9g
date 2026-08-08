type MayaTaskHistoryLookupInput = {
  taskId: string
  sessionStartedAt: number
  conciergeMountedAt: number
  hasLocalSnapshot: boolean
}
const FRESH_TASK_MOUNT_GRACE_MS = 5_000

/**
 * A Create task born after this concierge mounted cannot have server history yet.
 * Starting it immediately avoids making the member wait behind a history request that can only
 * return empty. Restored, Calendar, learning, and locally saved tasks still hydrate normally.
 */
export function shouldSkipMayaTaskHistoryLookup({
  taskId,
  sessionStartedAt,
  conciergeMountedAt,
  hasLocalSnapshot,
}: MayaTaskHistoryLookupInput): boolean {
  return (
    !hasLocalSnapshot &&
    taskId.startsWith("maya-task-") &&
    // Maya Home intentionally creates the neutral task just before mounting its workspace.
    // Treat that same-event task as fresh too; it cannot have server history yet.
    sessionStartedAt >= conciergeMountedAt - FRESH_TASK_MOUNT_GRACE_MS
  )
}
