import {
  canTransitionFounderFeedbackStatus,
  founderFeedbackStatusLabel,
  isFounderFeedbackStatus,
  type FounderFeedbackStatus,
} from "@/lib/app-v3/maya/founder-feedback"
import { sql } from "@/lib/db/client"

type QueueRow = {
  id: string
  type: string
  subject: string
  message: string
  founder_test_status: FounderFeedbackStatus
  feedback_context: Record<string, unknown> | null
  source_path: string | null
  app_commit_sha: string | null
  resolution_commit_sha: string | null
  images: string[] | null
  admin_reply: string | null
  created_at: string
  updated_at: string
}

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 && typeof process.argv[index + 1] === "string" ? process.argv[index + 1] : null
}

function serialize(row: QueueRow) {
  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    message: row.message,
    status: row.founder_test_status,
    statusLabel: founderFeedbackStatusLabel(row.founder_test_status),
    context: row.feedback_context || {},
    sourcePath: row.source_path,
    appCommitSha: row.app_commit_sha,
    resolutionCommitSha: row.resolution_commit_sha,
    screenshots: row.images || [],
    note: row.admin_reply,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function listQueue() {
  const requestedStatus = argumentValue("--status")
  const status =
    requestedStatus && isFounderFeedbackStatus(requestedStatus) ? requestedStatus : null
  const rows = status
    ? await sql`
        SELECT
          id, type, subject, message, founder_test_status, feedback_context,
          source_path, app_commit_sha, resolution_commit_sha, images, admin_reply, created_at, updated_at
        FROM feedback
        WHERE founder_test_status = ${status}
        ORDER BY created_at ASC
        LIMIT 50
      `
    : await sql`
        SELECT
          id, type, subject, message, founder_test_status, feedback_context,
          source_path, app_commit_sha, resolution_commit_sha, images, admin_reply, created_at, updated_at
        FROM feedback
        WHERE founder_test_status IS NOT NULL
          AND founder_test_status NOT IN ('verified', 'deferred')
        ORDER BY created_at ASC
        LIMIT 50
      `

  console.log(
    JSON.stringify({ count: rows.length, reports: (rows as QueueRow[]).map(serialize) }, null, 2)
  )
}

async function updateQueueItem() {
  const id = argumentValue("--set-status")
  const idIndex = process.argv.indexOf("--set-status")
  const requestedStatus = idIndex >= 0 ? process.argv[idIndex + 2] : null
  if (!id || !isFounderFeedbackStatus(requestedStatus)) {
    throw new Error("Usage: --set-status <feedback-id> <status> [--note <text>] [--sha <commit>]")
  }

  const currentRows = await sql`
    SELECT founder_test_status
    FROM feedback
    WHERE id = ${id} AND founder_test_status IS NOT NULL
    LIMIT 1
  `
  const current = currentRows[0]?.founder_test_status
  if (!isFounderFeedbackStatus(current)) throw new Error("Founder feedback report not found")
  if (!canTransitionFounderFeedbackStatus(current, requestedStatus)) {
    throw new Error(`Invalid founder feedback transition: ${current} -> ${requestedStatus}`)
  }

  const note = argumentValue("--note")
  const commitSha = argumentValue("--sha")
  const supportStatus =
    requestedStatus === "verified" ? "resolved" : requestedStatus === "new" ? "new" : "reviewing"
  const rows = await sql`
    UPDATE feedback
    SET
      founder_test_status = ${requestedStatus},
      status = ${supportStatus},
      admin_reply = COALESCE(${note}, admin_reply),
      replied_at = CASE WHEN ${note}::text IS NULL THEN replied_at ELSE NOW() END,
      resolution_commit_sha = COALESCE(${commitSha}, resolution_commit_sha),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING
      id, type, subject, message, founder_test_status, feedback_context,
      source_path, app_commit_sha, resolution_commit_sha, images, admin_reply, created_at, updated_at
  `
  console.log(JSON.stringify({ report: serialize(rows[0] as QueueRow) }, null, 2))
}

async function main() {
  if (process.argv.includes("--set-status")) await updateQueueItem()
  else await listQueue()
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
