import "dotenv/config"
import { config as loadDotenv } from "dotenv"
import { resolve } from "node:path"

import {
  AI_PHOTOSHOOT_AUDIENCE,
  AI_PHOTOSHOOT_INTENT_TAGS,
  buildAiPhotoshootEmailTags,
  buildAiPhotoshootResendTags,
  type AiPhotoshootIntent,
} from "@/lib/audience/ai-photoshoot-segment"
import { sql } from "@/lib/db/client"

loadDotenv({ path: resolve(process.cwd(), ".env.local") })

type AudienceCandidate = {
  email: string
  name: string | null
  email_tags: string[] | null
  latest_seen_at: string | null
  is_ai_prompt_lead: boolean
  is_prompt_vault_buyer: boolean
  is_prompt_vault_abandoned: boolean
}

type SyncOptions = {
  dryRun: boolean
  limit: number
  segmentOnly: boolean
}

const RESEND_REQUEST_TIMEOUT_MS = 12_000
const RESEND_CONTACT_DELAY_MS = 500

function parseOptions(): SyncOptions {
  const args = new Set(process.argv.slice(2))
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))
  const parsedLimit = limitArg ? Number.parseInt(limitArg.split("=")[1] || "", 10) : 5000

  return {
    dryRun: args.has("--dry-run"),
    limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5000,
    segmentOnly: args.has("--segment-only"),
  }
}

function resolveIntent(candidate: AudienceCandidate): AiPhotoshootIntent {
  if (candidate.is_prompt_vault_buyer) return "buyer"
  if (candidate.is_prompt_vault_abandoned) return "abandoned"
  return "curious"
}

function firstNameFor(candidate: AudienceCandidate): string | null {
  const name = candidate.name?.trim()
  if (name) return name.split(/\s+/)[0] || name

  const local = candidate.email.split("@")[0]?.trim()
  return local || null
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function getCandidates(limit: number): Promise<AudienceCandidate[]> {
  return (await sql`
    WITH base AS (
      SELECT
        LOWER(BTRIM(fs.email)) AS email,
        NULLIF(BTRIM(fs.name), '') AS name,
        COALESCE(fs.email_tags, ARRAY[]::text[]) AS email_tags,
        GREATEST(
          COALESCE(fs.updated_at, fs.created_at),
          COALESCE(fs.converted_at, fs.created_at)
        ) AS latest_seen_at,
        (
          fs.source = 'ai-prompts'
          OR 'ai-prompts-subscriber' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        ) AS is_ai_prompt_lead,
        (
          fs.source = 'prompt-vault-paid'
          OR 'prompt-vault-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        ) AS is_prompt_vault_buyer,
        FALSE AS is_prompt_vault_abandoned
      FROM freebie_subscribers fs
      WHERE fs.email IS NOT NULL
        AND fs.email <> ''
        AND (
          fs.source IN ('ai-prompts', 'prompt-vault-paid')
          OR COALESCE(fs.email_tags, ARRAY[]::text[]) && ARRAY[
            'ai-prompts-subscriber',
            'prompt-vault-paid',
            ${AI_PHOTOSHOOT_AUDIENCE.canonicalTag},
            ${AI_PHOTOSHOOT_INTENT_TAGS.curious},
            ${AI_PHOTOSHOOT_INTENT_TAGS.buyer},
            ${AI_PHOTOSHOOT_INTENT_TAGS.abandoned}
          ]::text[]
        )

      UNION ALL

      SELECT
        LOWER(BTRIM(ca.user_email)) AS email,
        NULL AS name,
        ARRAY[]::text[] AS email_tags,
        MAX(ca.updated_at) AS latest_seen_at,
        FALSE AS is_ai_prompt_lead,
        BOOL_OR(ca.status = 'completed') AS is_prompt_vault_buyer,
        BOOL_OR(ca.status IN ('started', 'abandoned')) AS is_prompt_vault_abandoned
      FROM checkout_attribution ca
      WHERE ca.product_type = 'prompt_vault'
        AND ca.user_email IS NOT NULL
        AND ca.user_email <> ''
      GROUP BY LOWER(BTRIM(ca.user_email))
    )
    SELECT DISTINCT ON (email)
      email,
      name,
      email_tags,
      latest_seen_at::text AS latest_seen_at,
      BOOL_OR(is_ai_prompt_lead) OVER (PARTITION BY email) AS is_ai_prompt_lead,
      BOOL_OR(is_prompt_vault_buyer) OVER (PARTITION BY email) AS is_prompt_vault_buyer,
      BOOL_OR(is_prompt_vault_abandoned) OVER (PARTITION BY email) AS is_prompt_vault_abandoned
    FROM base
    WHERE email IS NOT NULL
      AND email <> ''
    ORDER BY email, latest_seen_at DESC NULLS LAST
    LIMIT ${limit}
  `) as AudienceCandidate[]
}

async function updateNeon(candidate: AudienceCandidate, intent: AiPhotoshootIntent, dryRun: boolean) {
  const nextTags = buildAiPhotoshootEmailTags(candidate.email_tags, [intent])

  if (dryRun) return

  await sql`
    UPDATE freebie_subscribers
    SET
      email_tags = ${nextTags}::text[],
      updated_at = NOW()
    WHERE LOWER(BTRIM(email)) = ${candidate.email}
  `
}

async function ensureResendContact(
  candidate: AudienceCandidate,
  intent: AiPhotoshootIntent,
  segmentId: string | null,
  dryRun: boolean,
  segmentOnly: boolean,
) {
  const audienceId = process.env.RESEND_AUDIENCE_ID
  const apiKey = process.env.RESEND_API_KEY
  if (!audienceId || !apiKey) {
    throw new Error("RESEND_API_KEY and RESEND_AUDIENCE_ID are required for Resend sync")
  }

  const tags = {
    source: AI_PHOTOSHOOT_AUDIENCE.source,
    status: candidate.is_prompt_vault_buyer ? "customer" : "lead",
    ...buildAiPhotoshootResendTags(intent),
  }

  if (dryRun) return

  if (!segmentOnly) {
    const formattedTags = Object.entries(tags).map(([name, value]) => ({ name, value }))
    const contactResponse = await resendFetchWithTimeout(`/audiences/${audienceId}/contacts`, {
      method: "POST",
      body: JSON.stringify({
        email: candidate.email,
        firstName: firstNameFor(candidate) || undefined,
        tags: formattedTags,
      }),
    })

    if (!contactResponse.ok) {
      const text = await contactResponse.text().catch(() => "")
      if (!/already|exist|409/i.test(text)) {
        console.warn(
          `[ai-photoshoot-sync] Resend contact sync failed for ${candidate.email}: ${contactResponse.status} ${text.slice(0, 240)}`,
        )
      }
    }
  }

  if (segmentId) {
    const response = await resendFetchWithTimeout(
      `/contacts/${encodeURIComponent(candidate.email)}/segments/${encodeURIComponent(segmentId)}`,
      { method: "POST" },
    )

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      if (!/already|exist|409/i.test(text)) {
        console.warn(
          `[ai-photoshoot-sync] Segment add failed for ${candidate.email}: ${response.status} ${text.slice(0, 240)}`,
        )
      }
    }
  }
}

async function resendFetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY is required")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RESEND_REQUEST_TIMEOUT_MS)

  try {
    return await fetch(`https://api.resend.com${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  const options = parseOptions()
  const rawCandidates = await getCandidates(options.limit)
  const candidates = rawCandidates.filter((candidate) => isValidEmail(candidate.email))
  const skippedInvalidEmails = rawCandidates.length - candidates.length
  const segmentId = process.env[AI_PHOTOSHOOT_AUDIENCE.resendSegmentEnvKey] || null
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID)

  console.log("[ai-photoshoot-sync] AI Photoshoot Audience sync")
  console.log(`[ai-photoshoot-sync] candidates=${candidates.length} dryRun=${options.dryRun}`)
  console.log(`[ai-photoshoot-sync] segmentOnly=${options.segmentOnly}`)
  console.log(`[ai-photoshoot-sync] skippedInvalidEmails=${skippedInvalidEmails}`)
  console.log(`[ai-photoshoot-sync] resendSegment=${segmentId ? "configured" : "not configured"}`)

  const counts: Record<AiPhotoshootIntent, number> = {
    curious: 0,
    activated: 0,
    buyer: 0,
    powerUser: 0,
    abandoned: 0,
  }

  let resendSynced = 0

  for (const [index, candidate] of candidates.entries()) {
    const intent = resolveIntent(candidate)
    counts[intent] += 1

    await updateNeon(candidate, intent, options.dryRun)

    if (resendConfigured && !options.dryRun) {
      await ensureResendContact(candidate, intent, segmentId, options.dryRun, options.segmentOnly)
      resendSynced += 1
      if (resendSynced % 100 === 0 || index === candidates.length - 1) {
        console.log(`[ai-photoshoot-sync] progress=${resendSynced}/${candidates.length}`)
      }
      await new Promise((resolve) => setTimeout(resolve, RESEND_CONTACT_DELAY_MS))
    }
  }

  console.log("[ai-photoshoot-sync] complete")
  console.log(
    JSON.stringify(
      { counts, skippedInvalidEmails, neonUpdated: options.dryRun ? 0 : candidates.length, resendSynced },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error("[ai-photoshoot-sync] failed:", error)
  process.exit(1)
})
