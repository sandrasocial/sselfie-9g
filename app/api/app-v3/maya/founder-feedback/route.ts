import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"
import {
  buildFounderFeedbackSubject,
  feedbackTypeForFounderReport,
  founderFeedbackStatusLabel,
  normalizeFounderFeedbackPayload,
  type FounderFeedbackReportType,
} from "@/lib/app-v3/maya/founder-feedback"
import { isMayaHomeEnabled } from "@/lib/app-v3/maya/operating-layer-rollout"
import {
  detectFounderScreenshotContentType,
  encryptFounderScreenshot,
} from "@/lib/app-v3/maya/founder-screenshot"
import { getOrCreateNeonUser } from "@/lib/user-mapping"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024
const ALLOWED_SCREENSHOT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

type FeedbackRow = {
  id: string
  message: string
  founder_test_status: string | null
  feedback_context?: { reportType?: unknown } | null
  created_at: string
  admin_reply?: string | null
}

async function requireFounder() {
  const { user, error } = await getAuthenticatedUser()
  if (error || !user?.email) return { error: "Unauthorized" as const, status: 401 as const }
  if (!isMayaHomeEnabled({ userId: user.id, email: user.email })) {
    return { error: "Not available" as const, status: 404 as const }
  }

  const displayName =
    (user.user_metadata?.name as string | undefined) ||
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.first_name as string | undefined) ||
    user.email.split("@")[0]
  const neonUser = await getOrCreateNeonUser(user.id, user.email, displayName)
  return { user, neonUser, displayName }
}

function reportTypeFromRow(row: FeedbackRow): FounderFeedbackReportType {
  const reportType = row.feedback_context?.reportType
  if (
    reportType === "blocked" ||
    reportType === "confusing" ||
    reportType === "quality" ||
    reportType === "idea"
  ) {
    return reportType
  }
  return "quality"
}

function serializeReport(row: FeedbackRow) {
  const status = row.founder_test_status || "new"
  return {
    id: row.id,
    reportType: reportTypeFromRow(row),
    message: row.message,
    status,
    statusLabel: founderFeedbackStatusLabel(status),
    createdAt: row.created_at,
    note: row.admin_reply || null,
  }
}

export async function GET() {
  try {
    const identity = await requireFounder()
    if ("error" in identity) {
      return NextResponse.json({ error: identity.error }, { status: identity.status })
    }

    const rows = await sql`
      SELECT
        id,
        message,
        founder_test_status,
        feedback_context,
        created_at,
        admin_reply
      FROM feedback
      WHERE user_id = ${String(identity.neonUser.id)}
        AND founder_test_status IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 30
    `

    return NextResponse.json({ reports: (rows as FeedbackRow[]).map(serializeReport) })
  } catch (error) {
    console.error("[maya founder feedback] list failed:", error)
    return NextResponse.json({ error: "Reports are unavailable right now" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await requireFounder()
    if ("error" in identity) {
      return NextResponse.json({ error: identity.error }, { status: identity.status })
    }

    let rawPayload: unknown = null
    let screenshot: File | null = null
    try {
      const form = await request.formData()
      const payloadField = form.get("payload")
      rawPayload = typeof payloadField === "string" ? JSON.parse(payloadField) : null
      const screenshotField = form.get("screenshot")
      if (screenshotField instanceof File && screenshotField.size > 0) screenshot = screenshotField
    } catch {
      return NextResponse.json({ error: "This report could not be read" }, { status: 400 })
    }

    const payload = normalizeFounderFeedbackPayload(rawPayload)
    if (!payload) {
      return NextResponse.json({ error: "Write a short note about what happened" }, { status: 400 })
    }

    const existing = await sql`
      SELECT
        id,
        message,
        founder_test_status,
        feedback_context,
        created_at,
        admin_reply
      FROM feedback
      WHERE client_report_id = ${payload.clientReportId}
        AND user_id = ${String(identity.neonUser.id)}
      LIMIT 1
    `
    if (existing.length > 0) {
      return NextResponse.json({ report: serializeReport(existing[0] as FeedbackRow) })
    }

    let screenshotPathname: string | null = null
    let screenshotEncryption: ReturnType<typeof encryptFounderScreenshot> | null = null
    let screenshotError: string | null = null
    if (screenshot) {
      if (!ALLOWED_SCREENSHOT_TYPES.has(screenshot.type)) {
        return NextResponse.json({ error: "Use a JPG, PNG, or WebP screenshot" }, { status: 400 })
      }
      if (screenshot.size > MAX_SCREENSHOT_BYTES) {
        return NextResponse.json({ error: "Screenshot is too large (max 8MB)" }, { status: 400 })
      }

      const screenshotBytes = new Uint8Array(await screenshot.arrayBuffer())
      const screenshotContentType = detectFounderScreenshotContentType(screenshotBytes)
      if (!screenshotContentType) {
        return NextResponse.json({ error: "Screenshot is not a supported image" }, { status: 400 })
      }
      const extension =
        screenshotContentType === "image/png"
          ? "png"
          : screenshotContentType === "image/webp"
            ? "webp"
            : "jpg"
      try {
        screenshotEncryption = encryptFounderScreenshot(screenshotBytes, screenshotContentType)
        const uploaded = await put(
          `founder-feedback/${identity.neonUser.id}/${payload.clientReportId}.${extension}.enc`,
          screenshotEncryption.body,
          {
            // This Vercel Blob store is public-only. The object is AES-256-GCM ciphertext;
            // only the authenticated admin proxy can read its database-held key.
            access: "public",
            contentType: "application/octet-stream",
            addRandomSuffix: true,
          }
        )
        screenshotPathname = uploaded.pathname
      } catch (error) {
        console.error("[maya founder feedback] screenshot upload failed:", error)
        screenshotEncryption = null
        screenshotError = "upload_failed"
      }
    }

    const appCommitSha =
      process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || null
    const feedbackContext = {
      ...payload.context,
      reportType: payload.reportType,
      screenshotError,
      serverCapturedAt: new Date().toISOString(),
    }
    const subject = buildFounderFeedbackSubject(payload.reportType, payload.message)
    const feedbackType = feedbackTypeForFounderReport(payload.reportType)
    const sourcePath = payload.context.currentPath || "/app"

    const rows = await sql`
      INSERT INTO feedback (
        user_id,
        user_email,
        user_name,
        type,
        subject,
        message,
        status,
        founder_test_status,
        feedback_context,
        source_path,
        app_commit_sha,
        client_report_id,
        founder_screenshot_key,
        founder_screenshot_iv,
        founder_screenshot_auth_tag,
        founder_screenshot_content_type,
        images,
        created_at,
        updated_at
      )
      VALUES (
        ${String(identity.neonUser.id)},
        ${identity.user.email},
        ${identity.displayName},
        ${feedbackType},
        ${subject},
        ${payload.message},
        'new',
        'new',
        ${JSON.stringify(feedbackContext)}::jsonb,
        ${sourcePath},
        ${appCommitSha},
        ${payload.clientReportId},
        ${screenshotEncryption?.key || null},
        ${screenshotEncryption?.iv || null},
        ${screenshotEncryption?.authTag || null},
        ${screenshotEncryption?.contentType || null},
        ${screenshotPathname ? [screenshotPathname] : null},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        message,
        founder_test_status,
        feedback_context,
        created_at,
        admin_reply
    `

    return NextResponse.json({ report: serializeReport(rows[0] as FeedbackRow) }, { status: 201 })
  } catch (error) {
    console.error("[maya founder feedback] create failed:", error)
    return NextResponse.json(
      { error: "The report did not save. Your note is still here—try again." },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const identity = await requireFounder()
    if ("error" in identity) {
      return NextResponse.json({ error: identity.error }, { status: identity.status })
    }
    const body = (await request.json().catch(() => null)) as {
      id?: unknown
      action?: unknown
    } | null
    const id = typeof body?.id === "string" ? body.id.trim() : ""
    const action = body?.action
    if (!id || (action !== "verify" && action !== "reopen")) {
      return NextResponse.json({ error: "Unknown report action" }, { status: 400 })
    }

    const founderStatus = action === "verify" ? "verified" : "new"
    const supportStatus = action === "verify" ? "resolved" : "new"
    const rows = await sql`
      UPDATE feedback
      SET
        founder_test_status = ${founderStatus},
        status = ${supportStatus},
        updated_at = NOW()
      WHERE id = ${id}
        AND user_id = ${String(identity.neonUser.id)}
        AND founder_test_status IS NOT NULL
      RETURNING
        id,
        message,
        founder_test_status,
        feedback_context,
        created_at,
        admin_reply
    `
    if (rows.length === 0) return NextResponse.json({ error: "Report not found" }, { status: 404 })
    return NextResponse.json({ report: serializeReport(rows[0] as FeedbackRow) })
  } catch (error) {
    console.error("[maya founder feedback] update failed:", error)
    return NextResponse.json({ error: "The report could not be updated" }, { status: 500 })
  }
}
