import { type NextRequest, NextResponse } from "next/server"
import {
  claimAdminAction,
  completeAdminAction,
  dismissAdminAction,
  failAdminAction,
  getAdminActionByToken,
} from "@/lib/admin/action-queue"
import { executeAdminAction } from "@/lib/admin/action-executor"

export const dynamic = "force-dynamic"

function resultRedirect(request: NextRequest, token: string, result: string) {
  return NextResponse.redirect(
    new URL(`/approve/${encodeURIComponent(token)}?result=${encodeURIComponent(result)}`, request.url),
    303,
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  let action
  try {
    action = await getAdminActionByToken(token)
  } catch {
    return resultRedirect(request, token, "invalid")
  }
  if (!action) return resultRedirect(request, token, "invalid")

  const form = await request.formData()
  const decision = String(form.get("decision") || "")
  if (decision === "dismiss") {
    const dismissed = await dismissAdminAction(action.id)
    return resultRedirect(request, token, dismissed ? "dismissed" : action.status)
  }
  if (decision !== "approve") return resultRedirect(request, token, "invalid")

  const claimed = await claimAdminAction(action.id)
  if (!claimed) {
    const latest = await getAdminActionByToken(token).catch(() => null)
    return resultRedirect(request, token, latest?.status || "invalid")
  }

  const rawMessage = String(form.get("message") || "").trim()
  const editedMessage = rawMessage ? rawMessage.slice(0, 2000) : null
  try {
    await executeAdminAction(claimed, { editedMessage })
    const original = String(claimed.payload.draft || "").trim()
    const reviewNote = editedMessage && editedMessage !== original ? "Sandra edited the reply before sending." : null
    await completeAdminAction(claimed.id, reviewNote)
    return resultRedirect(request, token, "completed")
  } catch (error) {
    await failAdminAction(claimed.id, error)
    return resultRedirect(request, token, "failed")
  }
}

