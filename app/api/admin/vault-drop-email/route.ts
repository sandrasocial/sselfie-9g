import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { EMAIL_CONFIG } from "@/lib/email/config"
import { buildDropEmailType, buildDropKey, getPendingCollections } from "@/lib/vault/drop-log"
import { generateVaultDropBuyerEmail } from "@/lib/email/templates/vault-drop-buyer"
import { generateVaultDropNonbuyerEmail } from "@/lib/email/templates/vault-drop-nonbuyer"
import type { VaultDropCollection } from "@/lib/vault/drop-log"

export const dynamic = "force-dynamic"

const ADMIN_TEST_EMAIL = "ssa@ssasocial.com"

type SubscriberPreview = { email: string; name: string | null }

async function requireAdminResponse() {
  const admin = await requireAdmin()
  if (!admin.isAdmin) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: 401 })
  }
  return null
}

async function countAndPreviewNonBuyers(
  dropEmailType: string,
): Promise<{ count: number; sample: SubscriberPreview[] }> {
  const rows = await sql`
    SELECT DISTINCT ON (LOWER(fs.email))
      LOWER(BTRIM(fs.email)) AS email,
      NULLIF(BTRIM(fs.name), '') AS name
    FROM freebie_subscribers fs
    WHERE fs.email IS NOT NULL
      AND fs.email <> ''
      AND LOWER(BTRIM(fs.email)) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      AND (
        fs.source = 'ai-prompts'
        OR 'ai-prompts-subscriber' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        OR 'ai-photoshoot-audience' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
      AND NOT (
        fs.source = 'prompt-vault-paid'
        OR 'prompt-vault-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
      AND NOT EXISTS (
        SELECT 1 FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(fs.email)
          AND el.email_type = ${dropEmailType}
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(fs.email)
  `

  const all = rows as SubscriberPreview[]
  return { count: all.length, sample: all.slice(0, 5) }
}

async function countAndPreviewBuyers(
  dropEmailType: string,
): Promise<{ count: number; sample: SubscriberPreview[] }> {
  const rows = await sql`
    SELECT DISTINCT ON (LOWER(fs.email))
      LOWER(BTRIM(fs.email)) AS email,
      NULLIF(BTRIM(fs.name), '') AS name
    FROM freebie_subscribers fs
    WHERE fs.email IS NOT NULL
      AND fs.email <> ''
      AND LOWER(BTRIM(fs.email)) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      AND (
        fs.source = 'prompt-vault-paid'
        OR 'prompt-vault-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
      AND fs.access_token IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(fs.email)
          AND el.email_type = ${dropEmailType}
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(fs.email)
  `

  const all = rows as SubscriberPreview[]
  return { count: all.length, sample: all.slice(0, 5) }
}

function buildEmails(collections: VaultDropCollection[]) {
  return {
    nonbuyer: generateVaultDropNonbuyerEmail({
      firstName: "Sandra",
      newCollections: collections,
      accessToken: "PREVIEW_TOKEN",
    }),
    buyer: generateVaultDropBuyerEmail({
      firstName: "Sandra",
      accessToken: "PREVIEW_TOKEN",
      newCollections: collections,
    }),
  }
}

async function buildPreviewPayload() {
  const collections = await getPendingCollections()
  const dropKey = buildDropKey(collections)
  const nonbuyerEmailType = buildDropEmailType(dropKey, "nonbuyer")
  const buyerEmailType = buildDropEmailType(dropKey, "buyer")
  const [nonbuyer, buyer] = await Promise.all([
    countAndPreviewNonBuyers(nonbuyerEmailType),
    countAndPreviewBuyers(buyerEmailType),
  ])
  const emails = buildEmails(collections)

  return {
    ready: collections.length >= 2,
    dropKey,
    idempotencyKeys: {
      nonbuyer: nonbuyerEmailType,
      buyer: buyerEmailType,
    },
    collections: collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      heroImage: collection.heroImage,
      moodLine: collection.moodLine,
    })),
    segments: {
      nonbuyers: {
        count: nonbuyer.count,
        sampleRecipients: nonbuyer.sample,
      },
      buyers: {
        count: buyer.count,
        sampleRecipients: buyer.sample,
      },
    },
    previews: {
      nonbuyer: emails.nonbuyer,
      buyer: emails.buyer,
    },
    totalRecipients: nonbuyer.count + buyer.count,
  }
}

export async function GET() {
  const authError = await requireAdminResponse()
  if (authError) return authError

  try {
    return NextResponse.json(await buildPreviewPayload())
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
    const audience = body.audience === "buyer" ? "buyer" : "nonbuyer"
    const payload = await buildPreviewPayload()
    if (!payload.ready) {
      return NextResponse.json(
        { error: "A drop needs at least 2 pending collections before test send.", pendingCount: payload.collections.length },
        { status: 422 },
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
    console.error("[admin/vault-drop-email] test send failed:", error)
    return NextResponse.json({ success: false, error: "Could not send test email" }, { status: 500 })
  }
}
