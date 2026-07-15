import "server-only"

import { randomBytes } from "node:crypto"
import { sql } from "@/lib/db/client"
import { ensureCampaignOutcomeSchema } from "@/lib/campaign-outcome/schema"
import type { CampaignOrder } from "@/lib/campaign-outcome/types"

export function createCampaignAccessToken(): string {
  return randomBytes(32).toString("base64url")
}

export async function getCampaignOrderByToken(token: string): Promise<CampaignOrder | null> {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null
  await ensureCampaignOutcomeSchema()
  const [order] = await sql`
    SELECT * FROM campaign_orders WHERE access_token = ${token} LIMIT 1
  `
  return (order as CampaignOrder | undefined) || null
}

export async function getCampaignOrderById(orderId: number): Promise<CampaignOrder | null> {
  await ensureCampaignOutcomeSchema()
  const [order] = await sql`
    SELECT * FROM campaign_orders WHERE id = ${orderId} LIMIT 1
  `
  return (order as CampaignOrder | undefined) || null
}

export async function resolveRepeatSourceOrder(input: {
  token?: string | null
  customerEmail: string
  isTestMode: boolean
}): Promise<number | null> {
  if (!input.token || !/^[A-Za-z0-9_-]{40,64}$/.test(input.token)) return null
  await ensureCampaignOutcomeSchema()
  const [order] = await sql`
    SELECT id
    FROM campaign_orders
    WHERE access_token = ${input.token}
      AND status = 'delivered'
      AND LOWER(customer_email) = LOWER(${input.customerEmail})
      AND is_test_mode = ${input.isTestMode}
    LIMIT 1
  `
  return order?.id ? Number(order.id) : null
}
