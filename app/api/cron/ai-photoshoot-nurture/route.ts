import { NextResponse } from "next/server"
import { createHash } from "node:crypto"

import { createCronLogger } from "@/lib/cron-logger"
import {
  createRuntimeBudget,
  runWithRuntimeBudget,
  type RuntimeBudget,
} from "@/lib/cron/runtime-budget"
import { sql } from "@/lib/db/client"
import { envFlag } from "@/lib/env-flags"
import {
  AI_PROMPTS_EMAIL_TOUCHES,
  type AiPromptsEmailType,
} from "@/lib/email/ai-prompts-email-sequence"
import {
  PROMPT_VAULT_EMAIL_TOUCHES,
  type PromptVaultEmailType,
} from "@/lib/email/prompt-vault-email-sequence"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { sendEmail } from "@/lib/email/send-email"
import { generateAiPromptsDay1VaultBridgeEmail } from "@/lib/email/templates/ai-prompts-day1-vault-bridge"
import { generateAiPromptsDay5EditMakesPostableEmail } from "@/lib/email/templates/ai-prompts-day5-edit-makes-postable"
import { generateAiPromptsDay7PromptVaultOfferEmail } from "@/lib/email/templates/ai-prompts-day7-prompt-vault-offer"
import { generateAiPromptsDay9PromptVaultProofEmail } from "@/lib/email/templates/ai-prompts-day9-prompt-vault-proof"
import {
  generatePromptVaultDay10NextShootEmail,
  generatePromptVaultDay2FirstResultEmail,
  generatePromptVaultDay5FixBadResultEmail,
} from "@/lib/email/templates/prompt-vault-buyer-sequence"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
  .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
  .replace(/\/+$/, "")
const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"
const DEFAULT_AI_PROMPTS_START_DATE = "2026-05-18"
const DEFAULT_SEND_DELAY_MS = 650
const MAX_PER_TOUCH_DEFAULT = 12
// Leave enough room for suppression checks, Resend calls, logging, and retries inside the
// 300-second Vercel budget. A 240-second internal deadline and a 50-attempt default leave
// recovery headroom after production runs at 100+ attempts reached the platform ceiling.
const MAX_TOTAL_PER_RUN_DEFAULT = 50
const MIN_TOUCH_GAP_HOURS_DEFAULT = 18
const RUNTIME_BUDGET_MS = 240_000
const MIN_QUERY_BUDGET_MS = 15_000
const MIN_SEND_BUDGET_MS = 15_000

interface AiPromptsCandidate {
  email: string
  name: string | null
  access_token: string | null
  created_at: string
}

interface PromptVaultCandidate {
  email: string
  name: string | null
  access_token: string | null
  converted_at: string | null
  created_at: string
}

interface TouchResult {
  found: number
  wouldSend: number
  sent: number
  failed: number
  skipped: number
  processed: number
  stoppedForBudget: boolean
  timedOut: boolean
}

interface NurtureCandidate {
  email: string
}

interface RunTouchInput<Candidate extends NurtureCandidate> {
  emailType: string
  result: TouchResult
  dryRun: boolean
  maxPerTouch: number
  remainingSends: number
  touchesRemaining: number
  runtimeBudget: RuntimeBudget
  getCandidates: (limit: number) => Promise<Candidate[]>
  sendCandidate: (
    candidate: Candidate,
    signal: AbortSignal
  ) => Promise<{ success: boolean; error?: string }>
  errors: Array<{ email: string; touch: string; error: string }>
  sendDelayMs: number
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function aiPromptsStartDate(): string {
  const configured = process.env.AI_PROMPTS_NURTURE_START_DATE?.trim()
  return configured && /^\d{4}-\d{2}-\d{2}$/.test(configured)
    ? configured
    : DEFAULT_AI_PROMPTS_START_DATE
}

function aiPromptsAccessUrl(candidate: { access_token: string | null }): string {
  const token = typeof candidate.access_token === "string" ? candidate.access_token.trim() : ""
  return token.length > 0 ? `${SITE_URL}/ai-prompts/access/${token}` : `${SITE_URL}/ai-prompts`
}

function promptVaultAccessUrl(candidate: { access_token: string | null }): string {
  const token = typeof candidate.access_token === "string" ? candidate.access_token.trim() : ""
  return token.length > 0 ? `${SITE_URL}/access/prompt-vault/${token}` : `${SITE_URL}/prompt-vault`
}

function previousAiPromptTouch(emailType: AiPromptsEmailType): AiPromptsEmailType | null {
  const index = AI_PROMPTS_EMAIL_TOUCHES.findIndex(touch => touch.emailType === emailType)
  if (index <= 0) return null
  return AI_PROMPTS_EMAIL_TOUCHES[index - 1]?.emailType || null
}

function previousPromptVaultTouch(emailType: PromptVaultEmailType): PromptVaultEmailType | null {
  const index = PROMPT_VAULT_EMAIL_TOUCHES.findIndex(touch => touch.emailType === emailType)
  if (index <= 0) return null
  return PROMPT_VAULT_EMAIL_TOUCHES[index - 1]?.emailType || null
}

function resultKey(emailType: string): string {
  return emailType.replace(/^ai-prompts-/, "aiPrompts-").replace(/^prompt-vault-/, "promptVault-")
}

function nurtureIdempotencyKey(emailType: string, email: string): string {
  const recipientHash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24)
  return `ai-photoshoot-nurture:${emailType}:${recipientHash}`
}

async function getAiPromptsCandidates(input: {
  emailType: AiPromptsEmailType
  days: number
  startDate: string
  previousEmailType: AiPromptsEmailType | null
  minTouchGapHours: number
  limit: number
}): Promise<AiPromptsCandidate[]> {
  const suppressIfSentTypes =
    AI_PROMPTS_EMAIL_TOUCHES.find(touch => touch.emailType === input.emailType)
      ?.suppressIfSentTypes || []
  const sentEmailTypes = [input.emailType, ...suppressIfSentTypes]

  return (await sql`
    WITH ai_candidates AS (
      SELECT DISTINCT ON (LOWER(fs.email))
        fs.email,
        NULLIF(BTRIM(fs.name), '') AS name,
        fs.access_token,
        fs.created_at
      FROM freebie_subscribers fs
      WHERE fs.created_at <= NOW() - (${`${input.days} days`}::interval)
        AND fs.created_at >= ${input.startDate}::date
        AND fs.email IS NOT NULL
        AND BTRIM(fs.email) <> ''
        AND BTRIM(fs.email) ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
        AND (
          fs.source = 'ai-prompts'
          OR 'ai-prompts-subscriber' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        )
        AND NOT (
          'prompt-vault-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
          OR 'bought_prompt_vault' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
          OR 'starter-kit-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
          OR 'bought_starter_kit' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
          OR 'selfie-ai-photos-kit-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
          OR 'bought_selfie_ai_photos_kit' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
          OR 'masterclass' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
          OR 'bought_masterclass' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        )
        AND NOT EXISTS (
          SELECT 1
          FROM users u
          INNER JOIN subscriptions s ON s.user_id = u.id::varchar
          WHERE LOWER(u.email) = LOWER(fs.email)
            AND s.product_type IN ('prompt_vault', 'starter_kit', 'masterclass')
            AND s.status = 'active'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM email_logs el
          WHERE LOWER(el.user_email) = LOWER(fs.email)
            AND el.email_type = ANY(${sentEmailTypes}::text[])
            AND el.status IN ('sent', 'delivered', 'suppressed')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM email_logs invalid_recipient
          WHERE LOWER(invalid_recipient.user_email) = LOWER(fs.email)
            AND invalid_recipient.status = 'failed'
            AND invalid_recipient.error_message LIKE 'Invalid recipient email:%'
        )
        AND (
          ${input.previousEmailType}::text IS NULL
          OR EXISTS (
            SELECT 1
            FROM email_logs previous_touch
            WHERE LOWER(previous_touch.user_email) = LOWER(fs.email)
              AND previous_touch.email_type = ${input.previousEmailType}
              AND previous_touch.status IN ('sent', 'delivered')
              AND COALESCE(previous_touch.sent_at, previous_touch.created_at, previous_touch.timestamp)
                <= NOW() - (${`${input.minTouchGapHours} hours`}::interval)
          )
        )
      ORDER BY LOWER(fs.email), fs.created_at DESC
    )
    SELECT email, name, access_token, created_at
    FROM ai_candidates
    ORDER BY created_at ASC
    LIMIT ${input.limit}
  `) as AiPromptsCandidate[]
}

async function getPromptVaultCandidates(input: {
  emailType: PromptVaultEmailType
  days: number
  previousEmailType: PromptVaultEmailType | null
  minTouchGapHours: number
  limit: number
}): Promise<PromptVaultCandidate[]> {
  return (await sql`
    WITH vault_candidates AS (
      SELECT DISTINCT ON (LOWER(fs.email))
        fs.email,
        NULLIF(BTRIM(fs.name), '') AS name,
        fs.access_token,
        fs.converted_at,
        fs.created_at,
        COALESCE(fs.converted_at, fs.updated_at, fs.created_at) AS buyer_at
      FROM freebie_subscribers fs
      WHERE COALESCE(fs.converted_at, fs.updated_at, fs.created_at) <= NOW() - (${`${input.days} days`}::interval)
        AND fs.email IS NOT NULL
        AND BTRIM(fs.email) <> ''
        AND BTRIM(fs.email) ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
        AND (
          fs.source = 'prompt-vault-paid'
          OR 'prompt-vault-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        )
        AND NOT EXISTS (
          SELECT 1
          FROM email_logs el
          WHERE LOWER(el.user_email) = LOWER(fs.email)
            AND el.email_type = ${input.emailType}
            AND el.status IN ('sent', 'delivered', 'suppressed')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM email_logs invalid_recipient
          WHERE LOWER(invalid_recipient.user_email) = LOWER(fs.email)
            AND invalid_recipient.status = 'failed'
            AND invalid_recipient.error_message LIKE 'Invalid recipient email:%'
        )
        AND (
          ${input.previousEmailType}::text IS NULL
          OR EXISTS (
            SELECT 1
            FROM email_logs previous_touch
            WHERE LOWER(previous_touch.user_email) = LOWER(fs.email)
              AND previous_touch.email_type = ${input.previousEmailType}
              AND previous_touch.status IN ('sent', 'delivered')
              AND COALESCE(previous_touch.sent_at, previous_touch.created_at, previous_touch.timestamp)
                <= NOW() - (${`${input.minTouchGapHours} hours`}::interval)
          )
        )
      ORDER BY LOWER(fs.email), buyer_at DESC
    )
    SELECT email, name, access_token, converted_at, created_at
    FROM vault_candidates
    ORDER BY COALESCE(converted_at, created_at) ASC
    LIMIT ${input.limit}
  `) as PromptVaultCandidate[]
}

function generateAiPromptsEmail(emailType: AiPromptsEmailType, candidate: AiPromptsCandidate) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })
  const accessUrl = aiPromptsAccessUrl(candidate)

  switch (emailType) {
    case "ai-prompts-day1-vault-bridge":
      return generateAiPromptsDay1VaultBridgeEmail({
        firstName,
        recipientEmail: candidate.email,
        accessUrl,
      })
    case "ai-prompts-day5-edit-makes-postable":
      return generateAiPromptsDay5EditMakesPostableEmail({
        firstName,
        accessUrl,
        recipientEmail: candidate.email,
      })
    case "ai-prompts-day7-prompt-vault-offer":
      return generateAiPromptsDay7PromptVaultOfferEmail({
        firstName,
        recipientEmail: candidate.email,
      })
    case "ai-prompts-day9-prompt-vault-proof":
      return generateAiPromptsDay9PromptVaultProofEmail({
        firstName,
        recipientEmail: candidate.email,
      })
    default:
      throw new Error(`Unknown AI prompts email type: ${emailType}`)
  }
}

function generatePromptVaultEmail(
  emailType: PromptVaultEmailType,
  candidate: PromptVaultCandidate
) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })
  const accessUrl = promptVaultAccessUrl(candidate)

  switch (emailType) {
    case "prompt-vault-day2-first-result":
      return generatePromptVaultDay2FirstResultEmail({ firstName, accessUrl })
    case "prompt-vault-day5-fix-bad-result":
      return generatePromptVaultDay5FixBadResultEmail({ firstName, accessUrl })
    case "prompt-vault-day10-next-shoot":
      return generatePromptVaultDay10NextShootEmail({ firstName, accessUrl })
    default:
      throw new Error(`Unknown Prompt Vault email type: ${emailType}`)
  }
}

async function sendAiPromptsTouch(
  emailType: AiPromptsEmailType,
  candidate: AiPromptsCandidate,
  signal: AbortSignal
) {
  const email = generateAiPromptsEmail(emailType, candidate)
  // The SUITE trial touch requires a claim token; subscribers without one are skipped, not failed.
  if (!email) return { success: false, error: "skipped: no claim token" }
  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType,
    tags: ["ai-prompts", "ai-photoshoot-nurture", emailType],
    marketing: true,
    idempotencyKey: nurtureIdempotencyKey(emailType, candidate.email),
    signal,
  })
}

async function sendPromptVaultTouch(
  emailType: PromptVaultEmailType,
  candidate: PromptVaultCandidate,
  signal: AbortSignal
) {
  const email = generatePromptVaultEmail(emailType, candidate)
  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType,
    tags: ["prompt-vault", "ai-photoshoot-nurture", emailType],
    marketing: true,
    idempotencyKey: nurtureIdempotencyKey(emailType, candidate.email),
    signal,
  })
}

function emptyTouchResult(): TouchResult {
  return {
    found: 0,
    wouldSend: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    processed: 0,
    stoppedForBudget: false,
    timedOut: false,
  }
}

function isTouchResult(value: unknown): value is TouchResult {
  return Boolean(
    value &&
    typeof value === "object" &&
    "found" in value &&
    "wouldSend" in value &&
    "sent" in value &&
    "failed" in value &&
    "skipped" in value &&
    "processed" in value
  )
}

async function runTouch<Candidate extends NurtureCandidate>({
  emailType,
  result,
  dryRun,
  maxPerTouch,
  remainingSends,
  touchesRemaining,
  runtimeBudget,
  getCandidates,
  sendCandidate,
  errors,
  sendDelayMs,
}: RunTouchInput<Candidate>): Promise<{ remainingSends: number; touchesRemaining: number }> {
  const nextTouchesRemaining = touchesRemaining - 1

  if (remainingSends <= 0) {
    result.skipped = dryRun ? 0 : maxPerTouch
    return { remainingSends, touchesRemaining: nextTouchesRemaining }
  }

  const fairTouchLimit = Math.min(
    maxPerTouch,
    remainingSends,
    Math.max(1, Math.ceil(remainingSends / touchesRemaining))
  )
  const selection = await runWithRuntimeBudget({
    budget: runtimeBudget,
    minimumRemainingMs: MIN_QUERY_BUDGET_MS,
    operation: () => getCandidates(fairTouchLimit),
  })

  if (!selection.completed) {
    result.stoppedForBudget = true
    result.timedOut = selection.timedOut
    return { remainingSends, touchesRemaining: nextTouchesRemaining }
  }

  const candidates = selection.value
  result.found = candidates.length

  if (dryRun) {
    result.wouldSend = candidates.length
    result.skipped = candidates.length
    return {
      remainingSends: remainingSends - candidates.length,
      touchesRemaining: nextTouchesRemaining,
    }
  }

  for (const candidate of candidates) {
    const delivery = await runWithRuntimeBudget({
      budget: runtimeBudget,
      minimumRemainingMs: MIN_SEND_BUDGET_MS,
      operation: signal => sendCandidate(candidate, signal),
    })
    if (!delivery.completed) {
      result.stoppedForBudget = true
      result.timedOut = delivery.timedOut
      break
    }

    if (delivery.value.success) {
      result.sent += 1
    } else {
      result.failed += 1
      errors.push({
        email: candidate.email,
        touch: emailType,
        error: delivery.value.error || "unknown",
      })
    }
    result.processed += 1

    if (result.processed < candidates.length) {
      const delay = await runWithRuntimeBudget({
        budget: runtimeBudget,
        minimumRemainingMs: MIN_SEND_BUDGET_MS,
        operation: () => sleep(sendDelayMs),
      })
      if (!delay.completed) {
        result.stoppedForBudget = true
        result.timedOut = delay.timedOut
        break
      }
    }
  }

  return {
    remainingSends: remainingSends - result.processed,
    touchesRemaining: nextTouchesRemaining,
  }
}

export async function GET(request: Request) {
  const runtimeBudget = createRuntimeBudget(RUNTIME_BUDGET_MS)
  const cronLogger = createCronLogger("ai-photoshoot-nurture")
  const logWithinRuntimeBudget = (write: () => Promise<void>) =>
    runWithRuntimeBudget({
      budget: runtimeBudget,
      minimumRemainingMs: 0,
      operation: () => write(),
    })
  await logWithinRuntimeBudget(() => cronLogger.start())

  try {
    const url = new URL(request.url)
    const dryRun =
      url.searchParams.get("dry_run") === "1" ||
      url.searchParams.get("dryRun") === "true" ||
      url.searchParams.get("preview") === "1"
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction =
      process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction) {
      if (!cronSecret) {
        await logWithinRuntimeBudget(() =>
          cronLogger.error(new Error("Unauthorized"), {
            reason: "CRON_SECRET not set in production",
          })
        )
        return NextResponse.json(
          { error: "Unauthorized: CRON_SECRET required in production" },
          { status: 401 }
        )
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        await logWithinRuntimeBudget(() =>
          cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        )
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const aiPromptsEnabled = envFlag("AI_PROMPTS_NURTURE_ENABLED")
    const promptVaultEnabled = envFlag("PROMPT_VAULT_NURTURE_ENABLED")
    const maxPerTouch = readIntEnv("AI_PHOTOSHOOT_NURTURE_MAX_PER_TOUCH", MAX_PER_TOUCH_DEFAULT)
    const maxTotalPerRun = readIntEnv(
      "AI_PHOTOSHOOT_NURTURE_MAX_TOTAL_PER_RUN",
      MAX_TOTAL_PER_RUN_DEFAULT
    )
    const sendDelayMs = readIntEnv("AI_PHOTOSHOOT_NURTURE_SEND_DELAY_MS", DEFAULT_SEND_DELAY_MS)
    const minTouchGapHours = readIntEnv(
      "AI_PHOTOSHOOT_NURTURE_MIN_TOUCH_GAP_HOURS",
      MIN_TOUCH_GAP_HOURS_DEFAULT
    )
    const startDate = aiPromptsStartDate()
    let remainingSends = maxTotalPerRun
    let touchesRemaining =
      (promptVaultEnabled || dryRun ? PROMPT_VAULT_EMAIL_TOUCHES.length : 0) +
      (aiPromptsEnabled || dryRun ? AI_PROMPTS_EMAIL_TOUCHES.length : 0)

    const results: Record<string, TouchResult | boolean | number | string> = {
      dryRun,
      aiPromptsEnabled,
      promptVaultEnabled,
      maxPerTouch,
      maxTotalPerRun,
      minTouchGapHours,
      startDate,
    }
    const errors: Array<{ email: string; touch: string; error: string }> = []

    // ── Ordering matters (email audit 2026-07-03): the send budget used to be consumed by
    // lead day-1 volume before anyone else got a turn, so PAYING Vault buyers received zero
    // onboarding since Jun 11 and deeper paid-offer touches never went out. Now:
    // 1. Vault BUYERS first (few people, highest trust, they just paid).
    // 2. Lead touches deepest-first (day 9 -> day 1): conversion-critical sends beat
    //    top-of-funnel mass. Later touches gate on PAST sends, so reverse order is safe. ──
    if (promptVaultEnabled || dryRun) {
      for (const touch of PROMPT_VAULT_EMAIL_TOUCHES) {
        const key = resultKey(touch.emailType)
        const result = emptyTouchResult()
        results[key] = result

        const next = await runTouch({
          emailType: touch.emailType,
          result,
          dryRun,
          maxPerTouch,
          remainingSends,
          touchesRemaining,
          runtimeBudget,
          getCandidates: limit =>
            getPromptVaultCandidates({
              emailType: touch.emailType,
              days: touch.days,
              previousEmailType: previousPromptVaultTouch(touch.emailType),
              minTouchGapHours,
              limit,
            }),
          sendCandidate: (candidate, signal) =>
            sendPromptVaultTouch(touch.emailType, candidate, signal),
          errors,
          sendDelayMs,
        })
        remainingSends = next.remainingSends
        touchesRemaining = next.touchesRemaining
      }
    }

    if (aiPromptsEnabled || dryRun) {
      for (const touch of [...AI_PROMPTS_EMAIL_TOUCHES].reverse()) {
        const key = resultKey(touch.emailType)
        const result = emptyTouchResult()
        results[key] = result

        const next = await runTouch({
          emailType: touch.emailType,
          result,
          dryRun,
          maxPerTouch,
          remainingSends,
          touchesRemaining,
          runtimeBudget,
          getCandidates: limit =>
            getAiPromptsCandidates({
              emailType: touch.emailType,
              days: touch.days,
              startDate,
              previousEmailType: previousAiPromptTouch(touch.emailType),
              minTouchGapHours,
              limit,
            }),
          sendCandidate: (candidate, signal) =>
            sendAiPromptsTouch(touch.emailType, candidate, signal),
          errors,
          sendDelayMs,
        })
        remainingSends = next.remainingSends
        touchesRemaining = next.touchesRemaining
      }
    }

    const totalSent = Object.values(results).reduce<number>(
      (total, value) => total + (isTouchResult(value) ? value.sent : 0),
      0
    )
    const totalWouldSend = Object.values(results).reduce<number>(
      (total, value) => total + (isTouchResult(value) ? value.wouldSend : 0),
      0
    )
    const totalFailed = Object.values(results).reduce<number>(
      (total, value) => total + (isTouchResult(value) ? value.failed : 0),
      0
    )

    const summary = {
      ...results,
      totalWouldSend,
      totalSent,
      totalFailed,
      remainingSends,
      runtime: {
        budgetMs: RUNTIME_BUDGET_MS,
        elapsedMs: runtimeBudget.elapsedMs(),
        remainingMs: runtimeBudget.remainingMs(),
        stoppedForBudget: !runtimeBudget.canStart(MIN_SEND_BUDGET_MS),
      },
    }
    await logWithinRuntimeBudget(() => cronLogger.success(summary))
    return NextResponse.json({
      success: true,
      ...summary,
      errors: errors.slice(0, 20),
    })
  } catch (error: unknown) {
    await logWithinRuntimeBudget(() => cronLogger.error(error, { step: "ai-photoshoot-nurture" }))
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "AI photoshoot nurture cron failed",
      },
      { status: 500 }
    )
  }
}
