interface SegmentSyncLogInput {
  email: string
  tagsUpdated: boolean
  error?: string
}

export function toSegmentSyncEmailLogEntry(input: SegmentSyncLogInput): {
  email: string
  status: "success" | "failed"
  errorMessage: string | null
} {
  return {
    email: input.email,
    status: input.tagsUpdated ? "success" : "failed",
    errorMessage: input.tagsUpdated ? null : input.error || "Unknown segment sync error",
  }
}
