import { NextResponse } from "next/server"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { getCampaignOrderByToken } from "@/lib/campaign-outcome/orders"
import { sql } from "@/lib/db/client"

type OrderAction = "downloaded" | "published_yes" | "published_no"

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const order = await getCampaignOrderByToken(token)
  if (!order || order.status !== "delivered")
    return NextResponse.json({ error: "Order not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const action = body?.action as OrderAction | undefined
  const assetType =
    typeof body?.assetType === "string" ? body.assetType.trim().slice(0, 80) || null : null
  if (!action || !["downloaded", "published_yes", "published_no"].includes(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  if (action === "downloaded") {
    await sql`UPDATE campaign_orders SET downloaded_at = COALESCE(downloaded_at, NOW()), updated_at = NOW() WHERE id = ${order.id}`
    await logAnalyticsEvent({
      eventName: "campaign_downloaded",
      userId: order.user_id,
      path: `/campaign/order/${token}`,
      properties: { order_id: order.id, asset_type: assetType },
    })
  } else {
    const answer = action === "published_yes"
    const rows = await sql`
      UPDATE campaign_orders
      SET published_answer = ${answer}, published_confirmed_at = NOW(), updated_at = NOW()
      WHERE id = ${order.id} AND published_confirmed_at IS NULL
      RETURNING id
    `
    if (rows[0]) {
      await logAnalyticsEvent({
        eventName: "campaign_published_confirmed",
        userId: order.user_id,
        path: `/campaign/order/${token}`,
        properties: { order_id: order.id, published: answer },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
