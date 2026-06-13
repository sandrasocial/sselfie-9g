import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { sendEmail } from "@/lib/email/send-email"
import { EMAIL_CONFIG } from "@/lib/email/config"
import {
  createVaultDropLiveRun,
  getVaultDropEmailPreview,
  selectedVaultDropIdsFromInput,
} from "@/lib/admin/vault-drop-email-workflow"

export const dynamic = "force-dynamic"

const ADMIN_TEST_EMAIL = "ssa@ssasocial.com"

async function requireAdminResponse() {
  const admin = await requireAdmin()
  if (!admin.isAdmin) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: 401 })
  }
  return null
}

export async function GET(request: NextRequest) {
  const authError = await requireAdminResponse()
  if (authError) return authError

  try {
    const selectedIds = selectedVaultDropIdsFromInput(request.nextUrl.searchParams.get("collectionIds"))
    return NextResponse.json(await getVaultDropEmailPreview(selectedIds))
  } catch (error) {
    console.error("[admin/vault-drop-email] preview failed:", error)
    return NextResponse.json({ error: "Could not build email preview" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminResponse()
  if (authError) return authError

  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action || "send_test"
    const audience = body.audience === "buyer" ? "buyer" : "nonbuyer"
    const selectedIds = selectedVaultDropIdsFromInput(body.collectionIds)
    const payload = await getVaultDropEmailPreview(selectedIds)
    if (!payload.ready) {
      return NextResponse.json(
        {
          error: "A drop needs at least 2 valid pending collections.",
          pendingCount: payload.collections.length,
          missingCollectionIds: payload.missingCollectionIds,
        },
        { status: 422 },
      )
    }

    if (action === "start_live_run") {
      const result = await createVaultDropLiveRun(selectedIds)
      return NextResponse.json(result, { status: "status" in result ? result.status ?? 200 : 200 })
    }

    if (action === "process_batch") {
      const runId = typeof body.runId === "string" ? body.runId : payload.latestRun?.id
      if (!runId) {
        return NextResponse.json({ success: false, error: "Create a live run before processing batches." }, { status: 422 })
      }

      const secret = process.env.VAULT_EMAIL_DROP_SECRET
      if (!secret) {
        return NextResponse.json(
          { success: false, error: "VAULT_EMAIL_DROP_SECRET is missing, so the batch processor cannot run." },
          { status: 500 },
        )
      }

      const response = await fetch(new URL("/api/vault/email-drop/process", request.url), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId,
          audienceType: body.audienceType || "all",
          batchSize: Number(body.batchSize || 25),
        }),
      })
      const data = await response.json()
      return NextResponse.json({ success: response.ok, ...data }, { status: response.status })
    }

    const email = audience === "buyer" ? payload.previews.buyer : payload.previews.nonbuyer
    const result = await sendEmail({
      to: ADMIN_TEST_EMAIL,
      subject: `[TEST] ${email.subject}`,
      html: email.html,
      text: email.text,
      from: EMAIL_CONFIG.marketing.from,
      replyTo: EMAIL_CONFIG.marketing.replyTo,
      marketing: true,
      emailType: `vault_drop_preview_test_${audience}`,
      tags: ["admin-test", "vault-drop-preview", `vault-${audience}`],
      idempotencyKey: `vault-drop-preview/${payload.dropKey}/${audience}/${new Date().toISOString().slice(0, 13)}`,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Test send failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      audience,
      to: ADMIN_TEST_EMAIL,
      messageId: result.messageId,
      subject: `[TEST] ${email.subject}`,
    })
  } catch (error) {
    console.error("[admin/vault-drop-email] action failed:", error)
    return NextResponse.json({ success: false, error: "Could not complete the drop email action" }, { status: 500 })
  }
}
