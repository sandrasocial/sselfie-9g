import "server-only"

import { randomBytes } from "node:crypto"

import { generateCampaignOrder } from "@/lib/campaign-outcome/generator"
import { createCampaignAccessToken } from "@/lib/campaign-outcome/orders"
import { ensureCampaignOutcomeSchema } from "@/lib/campaign-outcome/schema"
import { sql } from "@/lib/db/client"

const REQUIRED_GUARD = "ALLOW_CAMPAIGN_INTERNAL_QA"
const QA_EMAIL = "qa+campaign-internal@sselfie.ai"

function hasGenerateFlag(): boolean {
  return process.argv.includes("--generate")
}

function requestedOrderId(): number | null {
  const raw = process.argv.find(argument => argument.startsWith("--order-id="))?.split("=")[1]
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : null
}

async function main() {
  if (process.env[REQUIRED_GUARD] !== "true") {
    throw new Error(`${REQUIRED_GUARD}=true is required for an internal campaign QA order`)
  }

  await ensureCampaignOutcomeSchema()

  const retryOrderId = requestedOrderId()
  if (retryOrderId) {
    const [order] = await sql`
      UPDATE campaign_orders
      SET status = 'inputs_ready', generation_error = NULL, updated_at = NOW()
      WHERE id = ${retryOrderId}
        AND is_test_mode = TRUE
        AND customer_email = ${QA_EMAIL}
        AND status = 'generation_failed'
      RETURNING id, access_token, status
    `
    if (!order?.id) {
      throw new Error("The requested internal QA order is not a retryable failed test order")
    }
    console.log(
      JSON.stringify({
        orderId: Number(order.id),
        status: String(order.status),
        reviewPath: `/campaign/order/${String(order.access_token)}`,
        generated: false,
      })
    )
    if (!hasGenerateFlag()) return

    const result = await generateCampaignOrder(Number(order.id))
    const [updated] = await sql`
      SELECT status, generation_error
      FROM campaign_orders
      WHERE id = ${Number(order.id)}
      LIMIT 1
    `
    console.log(
      JSON.stringify({
        orderId: Number(order.id),
        status: String(updated?.status || "unknown"),
        generated: result.generated,
        reason: result.reason || updated?.generation_error || null,
      })
    )
    if (!result.generated) process.exitCode = 1
    return
  }

  const adminEmail = String(process.env.ADMIN_EMAIL || "ssa@ssasocial.com")
    .split(",")[0]
    .trim()
    .toLowerCase()
  const [admin] = await sql`
    SELECT id
    FROM users
    WHERE LOWER(email) = ${adminEmail}
    LIMIT 1
  `
  if (!admin?.id) throw new Error("Admin user not found for internal campaign QA")

  const [shoot] = await sql`
    SELECT COALESCE(selfie_urls ->> 0, selfie_url) AS selfie_url
    FROM content_shoots
    WHERE COALESCE(selfie_urls ->> 0, selfie_url) IS NOT NULL
      AND LENGTH(TRIM(COALESCE(selfie_urls ->> 0, selfie_url))) > 0
    ORDER BY created_at DESC
    LIMIT 1
  `
  const selfieUrl = typeof shoot?.selfie_url === "string" ? shoot.selfie_url.trim() : ""
  if (!selfieUrl) throw new Error("No approved admin selfie is available for internal campaign QA")

  const accessToken = createCampaignAccessToken()
  const stripeSessionId = `internal_qa_${Date.now()}_${randomBytes(5).toString("hex")}`
  const [order] = await sql`
    INSERT INTO campaign_orders (
      user_id,
      customer_email,
      customer_name,
      access_token,
      stripe_session_id,
      stripe_payment_id,
      status,
      selfie_url,
      what_she_sells,
      promotion,
      target_audience,
      voice_reference,
      platform,
      is_test_mode,
      inputs_completed_at
    ) VALUES (
      ${String(admin.id)},
      ${QA_EMAIL},
      ${"SSELFIE internal QA"},
      ${accessToken},
      ${stripeSessionId},
      ${stripeSessionId},
      ${"inputs_ready"},
      ${selfieUrl},
      ${
        "Vault Maya, a monthly SSELFIE photo membership where a woman adds her own selfies, chooses a finished Vault look, and Maya creates realistic personal-brand photos for her without copying prompts."
      },
      ${
        "The Vault Maya founder membership at $19 per month. It includes 30 monthly photo creations, the complete Vault look library, weekly new drops, a private gallery, downloads, and optional credit top-ups."
      },
      ${
        "Women over 35 who are building a personal brand or small business, want beautiful photos for their content, and do not want AI to change their face, age, body, or natural features."
      },
      ${
        "Write like Sandra explaining something honestly to one woman. Use complete natural sentences, simple everyday words, and specific practical meaning. Do not use generic SaaS language, clever slogan fragments, hype, fake urgency, income promises, or words such as visual world and explore."
      },
      ${"Instagram"},
      ${true},
      NOW()
    )
    RETURNING id, access_token, status
  `
  if (!order?.id) throw new Error("Internal campaign QA order was not created")

  console.log(
    JSON.stringify({
      orderId: Number(order.id),
      status: String(order.status),
      reviewPath: `/campaign/order/${String(order.access_token)}`,
      generated: false,
    })
  )

  if (!hasGenerateFlag()) return

  const result = await generateCampaignOrder(Number(order.id))
  const [updated] = await sql`
    SELECT status, generation_error
    FROM campaign_orders
    WHERE id = ${Number(order.id)}
    LIMIT 1
  `
  console.log(
    JSON.stringify({
      orderId: Number(order.id),
      status: String(updated?.status || "unknown"),
      generated: result.generated,
      reason: result.reason || updated?.generation_error || null,
    })
  )
  if (!result.generated) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
