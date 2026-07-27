type MayaTaskHistoryLookupInput = {
  taskId: string
  sessionStartedAt: number
  conciergeMountedAt: number
  hasLocalSnapshot: boolean
}

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
    sessionStartedAt >= conciergeMountedAt
  )
}
