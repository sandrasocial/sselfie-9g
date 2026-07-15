import { put } from "@vercel/blob"
import { after, NextResponse } from "next/server"
import sharp from "sharp"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { generateCampaignOrder } from "@/lib/campaign-outcome/generator"
import { getCampaignOrderByToken } from "@/lib/campaign-outcome/orders"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const MAX_BYTES = 12 * 1024 * 1024
const MIN_SHORT_SIDE = 512
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])

function safeText(value: FormDataEntryValue | null, max: number): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, max)
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const order = await getCampaignOrderByToken(token)
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (order.status !== "awaiting_intake") {
    return NextResponse.json({ ok: true, status: order.status })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Please use the campaign form." }, { status: 400 })
  }

  const file = form.get("selfie")
  const whatSheSells = safeText(form.get("whatSheSells"), 1200)
  const promotion = safeText(form.get("promotion"), 1200)
  const targetAudience = safeText(form.get("targetAudience"), 800)
  const voiceReference = safeText(form.get("voiceReference"), 1200)
  const platform = safeText(form.get("platform"), 50) || "Instagram"

  if (!(file instanceof File))
    return NextResponse.json({ error: "Add one clear selfie." }, { status: 400 })
  if (!ALLOWED.has(file.type))
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP selfie." }, { status: 400 })
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { error: "The selfie is too large. Maximum size is 12MB." },
      { status: 400 }
    )
  if (whatSheSells.length < 10 || promotion.length < 10 || targetAudience.length < 5) {
    return NextResponse.json(
      {
        error:
          "Tell Maya a little more about what you sell, what you want to promote, and who it is for.",
      },
      { status: 400 }
    )
  }

  const raw = Buffer.from(await file.arrayBuffer())
  try {
    const metadata = await sharp(raw).rotate().metadata()
    const shortSide = Math.min(metadata.width || 0, metadata.height || 0)
    if (shortSide < MIN_SHORT_SIDE) {
      return NextResponse.json(
        {
          error: "This selfie is too small. Choose a clearer photo straight from your camera roll.",
        },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json(
      { error: "Maya could not read this image. Try another JPG, PNG, or WebP selfie." },
      { status: 400 }
    )
  }

  const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg"
  const blob = await put(`campaign-outcomes/${order.id}/selfie.${ext}`, raw, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: true,
  })

  const rows = await sql`
    UPDATE campaign_orders
    SET
      selfie_url = ${blob.url},
      what_she_sells = ${whatSheSells},
      promotion = ${promotion},
      target_audience = ${targetAudience},
      voice_reference = ${voiceReference || null},
      platform = ${platform},
      status = 'inputs_ready',
      inputs_completed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${order.id} AND status = 'awaiting_intake'
    RETURNING id
  `
  if (!rows[0]) return NextResponse.json({ ok: true, status: "already_submitted" })

  await logAnalyticsEvent({
    eventName: "campaign_inputs_completed",
    userId: order.user_id,
    path: `/campaign/order/${token}`,
    properties: { order_id: order.id, platform },
  })
  after(async () => {
    await generateCampaignOrder(order.id)
  })

  return NextResponse.json({ ok: true, status: "inputs_ready" })
}
