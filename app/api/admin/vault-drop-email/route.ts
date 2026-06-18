import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { sendEmail } from "@/lib/email/send-email"
import { EMAIL_CONFIG } from "@/lib/email/config"
import {
  createVaultDropLiveRun,
  getVaultDropEmailPreview,
  getVaultDropRun,
  selectedVaultDropIdsFromInput,
} from "@/lib/admin/vault-drop-email-workflow"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const ADMIN_TEST_EMAIL = "ssa@ssasocial.com"
const LIVE_SEND_TIME_BUDGET_MS = 260_000
const LIVE_SEND_DEFAULT_MAX_BATCHES = 12

async function requireAdminResponse() {
  const admin = await requireAdmin()
  if (!admin.isAdmin) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: 401 })
  }
  return null
}

async function processVaultDropBatch({
  request,
  runId,
  audienceType,
  batchSize,
}: {
  request: NextRequest
  runId: string
  audienceType: "all" | "buyer" | "non_buyer"
  batchSize: number
}) {
  const secret = process.env.VAULT_EMAIL_DROP_SECRET
  if (!secret) {
    const data = {
      success: false,
      error: "VAULT_EMAIL_DROP_SECRET is missing, so the batch processor cannot run.",
    }
    return {
      response: NextResponse.json(data, { status: 500 }),
      data,
    }
  }

  const response = await fetch(new URL("/api/vault/email-drop/process", request.url), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      runId,
      audienceType,
      batchSize,
    }),
  })
  const data = await response.json()
  return { response, data }
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

    if (action === "send_live_now") {
      const result = await createVaultDropLiveRun(selectedIds)
      if (!result.success || !result.run) {
        return NextResponse.json(result, { status: "status" in result ? result.status ?? 200 : 200 })
      }

      const runId = result.run.id
      const batchSize = Number(body.batchSize || 25)
      const maxBatches = Math.max(1, Math.min(Number(body.maxBatches || LIVE_SEND_DEFAULT_MAX_BATCHES), 40))
      const startedAt = Date.now()
      let batchesProcessed = 0
      const totals = {
        batchSent: { nonBuyer: 0, buyer: 0 },
        batchFailed: { nonBuyer: 0, buyer: 0 },
        batchSkipped: { nonBuyer: 0, buyer: 0 },
      }
      let done = { nonBuyer: false, buyer: false, all: false }
      let lastData: any = null

      while (
        batchesProcessed < maxBatches &&
        Date.now() - startedAt < LIVE_SEND_TIME_BUDGET_MS &&
        !done.all
      ) {
        const { response, data } = await processVaultDropBatch({
          request,
          runId,
          audienceType: "all",
          batchSize,
        })
        lastData = data
        if (!response.ok || data.success === false) {
          return NextResponse.json(
            {
              success: false,
              error: data?.error || "Could not send the live drop email.",
              run: await getVaultDropRun(runId),
              batchesProcessed,
            },
            { status: response.status },
          )
        }

        batchesProcessed += 1
        totals.batchSent.nonBuyer += Number(data.batchSent?.nonBuyer || 0)
        totals.batchSent.buyer += Number(data.batchSent?.buyer || 0)
        totals.batchFailed.nonBuyer += Number(data.batchFailed?.nonBuyer || 0)
        totals.batchFailed.buyer += Number(data.batchFailed?.buyer || 0)
        totals.batchSkipped.nonBuyer += Number(data.batchSkipped?.nonBuyer || 0)
        totals.batchSkipped.buyer += Number(data.batchSkipped?.buyer || 0)
        done = data.done || done

        const batchWork =
          Number(data.batchSent?.nonBuyer || 0) +
          Number(data.batchSent?.buyer || 0) +
          Number(data.batchFailed?.nonBuyer || 0) +
          Number(data.batchFailed?.buyer || 0) +
          Number(data.batchSkipped?.nonBuyer || 0) +
          Number(data.batchSkipped?.buyer || 0)
        if (batchWork === 0 && !done.all) break
      }

      const run = await getVaultDropRun(runId)
      return NextResponse.json({
        success: true,
        existing: "existing" in result ? result.existing ?? false : false,
        run,
        done,
        batchesProcessed,
        ...totals,
        progress: lastData?.progress,
        message: done.all
          ? "Done. The drop email was sent."
          : "Started sending. Click Continue sending if there are more people left.",
      })
    }

    if (action === "process_batch") {
      const runId = typeof body.runId === "string" ? body.runId : payload.latestRun?.id
      if (!runId) {
        return NextResponse.json({ success: false, error: "Create a live run before processing batches." }, { status: 422 })
      }
      const audienceType =
        body.audienceType === "buyer" || body.audienceType === "non_buyer" ? body.audienceType : "all"
      const { response, data } = await processVaultDropBatch({
        request,
        runId,
        audienceType,
        batchSize: Number(body.batchSize || 25),
      })
      return NextResponse.json(
        { success: response.ok, ...data, run: await getVaultDropRun(runId) },
        { status: response.status },
      )
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
