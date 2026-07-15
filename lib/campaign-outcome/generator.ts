import "server-only"

import { put } from "@vercel/blob"
import { generateObject } from "ai"
import { z } from "zod"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { generateFeedImageWithOpenAI } from "@/lib/feed-planner/openai-image"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"
import { ensureCampaignOutcomeSchema } from "@/lib/campaign-outcome/schema"
import type { CampaignData, CampaignPost, CampaignPostRole } from "@/lib/campaign-outcome/types"

const planSchema = z.object({
  visualDirection: z.string().min(20).max(500),
  firstPostReason: z.string().min(10).max(300),
  posts: z
    .array(
      z.object({
        role: z.enum(["attention", "trust", "offer"]),
        headline: z.string().min(3).max(120),
        caption: z.string().min(40).max(1800),
        cta: z.string().min(2).max(220),
        visualPrompt: z.string().min(40).max(1800),
        whyThisPost: z.string().min(10).max(300),
      })
    )
    .length(3),
})

type ClaimedCampaignOrder = {
  id: number
  customer_email: string
  selfie_url: string
  what_she_sells: string
  promotion: string
  platform: string | null
}

function orderedPosts<T extends { role: CampaignPostRole }>(posts: T[]): T[] {
  const order: CampaignPostRole[] = ["attention", "trust", "offer"]
  return order
    .map(role => posts.find(post => post.role === role))
    .filter((post): post is T => Boolean(post))
}

async function claimCampaignOrder(orderId: number): Promise<ClaimedCampaignOrder | null> {
  await ensureCampaignOutcomeSchema()
  const rows = await sql`
    UPDATE campaign_orders
    SET
      status = 'generating',
      generation_started_at = NOW(),
      generation_attempts = generation_attempts + 1,
      generation_error = NULL,
      updated_at = NOW()
    WHERE id = ${orderId}
      AND status = 'inputs_ready'
      AND selfie_url IS NOT NULL
      AND what_she_sells IS NOT NULL
      AND promotion IS NOT NULL
    RETURNING id, customer_email, selfie_url, what_she_sells, promotion, platform
  `
  return (rows[0] as ClaimedCampaignOrder | undefined) || null
}

export async function generateCampaignOrder(
  orderId: number
): Promise<{ generated: boolean; reason?: string }> {
  const order = await claimCampaignOrder(orderId)
  if (!order) return { generated: false, reason: "not_ready_or_already_claimed" }

  try {
    const { object } = await generateObject({
      model: createMayaOpenRouterModel("feed_planner"),
      schema: planSchema,
      prompt: `You are Maya, Sandra's practical personal-brand creative director.

Create exactly three coordinated social posts for one small campaign in this exact order:
1. attention
2. trust
3. offer

What she sells:
${order.what_she_sells}

What she is promoting now:
${order.promotion}

Primary platform:
${order.platform || "Instagram"}

Rules:
- Use simple, everyday human language. Short sentences. No coach-speak, hype, fake urgency, or fluffy claims.
- Never invent a personal story, customer result, price, deadline, guarantee, credential, or product detail.
- If a claim is not present in the input, keep it general and editable.
- Each post must have a clear job: attention, trust, or offer.
- Each CTA must connect to what she is promoting without inventing a keyword or link.
- Make all three posts feel like one campaign, not three random ideas.
- The first post should be the easiest useful thing to publish first.
- Every visual prompt must describe a realistic editorial personal-brand photo using the same woman from the supplied reference selfie.
- Every visual prompt must include the exact sentence: "Use exact facial features from the reference image."
- Preserve her age, skin texture, face shape, hair, body proportions, and natural identity. Avoid plastic skin and visible AI tells.
- Do not put text, logos, or interface elements inside the generated image.
`,
    })

    const planPosts = orderedPosts(object.posts)
    if (planPosts.length !== 3) throw new Error("Maya did not return all three campaign roles")

    const imageUrls = await Promise.all(
      planPosts.map(async (post, index) => {
        const buffer = await generateFeedImageWithOpenAI({
          prompt: `${post.visualPrompt}\n\nUse exact facial features from the reference image. Create natural, high-end editorial photography with believable hands, skin texture, light, and proportions. No words or logos in the image.`,
          referenceUrls: [order.selfie_url],
          size: "1024x1536",
        })
        const blob = await put(
          `campaign-outcomes/${order.id}/${index + 1}-${post.role}.png`,
          buffer,
          {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: true,
          }
        )
        return blob.url
      })
    )

    const posts: CampaignPost[] = planPosts.map((post, index) => ({
      ...post,
      visualUrl: imageUrls[index],
    }))
    const campaignData: CampaignData = {
      visualDirection: object.visualDirection,
      firstPostReason: object.firstPostReason,
      posts,
    }

    const updated = await sql`
      UPDATE campaign_orders
      SET
        status = 'needs_qa',
        campaign_data = ${JSON.stringify(campaignData)}::jsonb,
        generated_at = NOW(),
        generation_error = NULL,
        updated_at = NOW()
      WHERE id = ${order.id} AND status = 'generating'
      RETURNING id
    `
    if (!updated[0]) throw new Error("Campaign order changed before generated work could be saved")

    await logAnalyticsEvent({
      eventName: "campaign_generated",
      path: "/campaign/order",
      properties: { order_id: order.id, post_count: 3 },
    })
    return { generated: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 1000) : "Campaign generation failed"
    await sql`
      UPDATE campaign_orders
      SET status = 'generation_failed', generation_error = ${message}, updated_at = NOW()
      WHERE id = ${order.id} AND status = 'generating'
    `
    console.error(`[campaign-outcome] Generation failed for order ${order.id}:`, error)
    return { generated: false, reason: message }
  }
}
