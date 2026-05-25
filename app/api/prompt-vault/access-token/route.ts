import { randomUUID } from "crypto"
import { NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import { stripe } from "@/lib/stripe"

const PROMPT_VAULT_PRODUCT_TYPE = "prompt_vault"

function resolvePromptVaultPurchaseEmail(session: {
  customer_details?: { email?: string | null; name?: string | null } | null
  customer_email?: string | null
}) {
  return session.customer_details?.email || session.customer_email || null
}

async function ensurePaidPromptVaultSubscriber(email: string, name?: string | null) {
  const resolvedName = (name || email.split("@")[0] || "Prompt Vault buyer").trim()
  const existingSubscriber = await sql`
    SELECT id, access_token, email_tags
    FROM freebie_subscribers
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `

  const existing = existingSubscriber[0] as
    | { id: number; access_token?: string | null; email_tags?: string[] | null }
    | undefined
  const accessToken = existing?.access_token?.trim() || randomUUID()
  const tags = new Set(Array.isArray(existing?.email_tags) ? existing.email_tags : [])
  tags.add("purchased")
  tags.add("customer")
  tags.add("prompt-vault-paid")
  const normalizedTags = Array.from(tags)

  if (existing) {
    await sql`
      UPDATE freebie_subscribers
      SET
        name = COALESCE(NULLIF(${resolvedName}, ''), name),
        source = 'prompt-vault-paid',
        access_token = ${accessToken},
        email_tags = ${normalizedTags}::text[],
        converted_to_user = TRUE,
        converted_at = COALESCE(converted_at, NOW()),
        updated_at = NOW()
      WHERE id = ${existing.id}
    `

    return { subscriberId: existing.id, accessToken }
  }

  const inserted = await sql`
    INSERT INTO freebie_subscribers (
      email,
      name,
      source,
      access_token,
      email_tags,
      converted_to_user,
      converted_at,
      created_at,
      updated_at
    )
    VALUES (
      ${email},
      ${resolvedName},
      'prompt-vault-paid',
      ${accessToken},
      ${normalizedTags}::text[],
      TRUE,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id
  `

  return { subscriberId: inserted[0].id as number, accessToken }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")?.trim()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const productType = session.metadata?.product_type || null

    if (productType !== PROMPT_VAULT_PRODUCT_TYPE) {
      return NextResponse.json(
        { error: "This session does not grant Prompt Vault access." },
        { status: 403 }
      )
    }

    if (
      session.status !== "complete" ||
      !["paid", "no_payment_required"].includes(session.payment_status || "")
    ) {
      return NextResponse.json({ error: "Prompt Vault access is still syncing." }, { status: 409 })
    }

    const email = resolvePromptVaultPurchaseEmail(session)
    if (!email) {
      return NextResponse.json(
        { error: "Prompt Vault access could not be verified yet." },
        { status: 404 }
      )
    }

    const subscriber = await ensurePaidPromptVaultSubscriber(
      email,
      session.customer_details?.name
    )
    return NextResponse.json({ accessToken: subscriber.accessToken, hasAccess: true })
  } catch (error) {
    console.error("[prompt-vault access-token] failed to resolve access token:", error)
    return NextResponse.json({ error: "Unable to load Prompt Vault access" }, { status: 500 })
  }
}
