import { sql } from "@/lib/db/client"
import { sendMarketingBroadcast } from "@/lib/email/marketing-sender"
import { requireResendClient } from "@/lib/resend/client"
import {
  VAULT_MAYA_LAUNCH_DEADLINE,
  VAULT_MAYA_LAUNCH_PROOF,
} from "./vault-maya-launch-plan"
import {
  removeVaultMayaLaunchSalesContact,
  RESEND_REQUEST_DELAY_MS,
  runResendRequest,
  VAULT_MAYA_LAUNCH_SEGMENT_ENV,
} from "./vault-maya-launch-segments"
import {
  generateVaultMayaFounderCloseEmail,
  generateVaultMayaFounderFinalDayEmail,
  generateVaultMayaFounderFinalHoursEmail,
  generateVaultMayaInsideLookEmail,
  generateVaultMayaLikenessEmail,
  generateVaultMayaProofEmail,
  generateVaultMayaUseCasesEmail,
  type VaultMayaMarketingEmail,
} from "@/lib/email/templates/vault-maya-marketing"

type FollowupAudience = "eligible" | "high-intent"

interface FollowupJob {
  id: string
  dueAt: string
  expiresAt: string
  audience: FollowupAudience
  email: () => VaultMayaMarketingEmail
}

const firstName = "{{{contact.first_name|there}}}"
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const VAULT_MAYA_LAUNCH_FOLLOWUPS: FollowupJob[] = [
  {
    id: "inside",
    dueAt: "2026-08-04T07:00:00.000Z",
    expiresAt: "2026-08-05T01:00:00.000Z",
    audience: "eligible",
    email: () => generateVaultMayaInsideLookEmail({ firstName }),
  },
  {
    id: "proof",
    dueAt: "2026-08-06T07:00:00.000Z",
    expiresAt: "2026-08-07T01:00:00.000Z",
    audience: "eligible",
    email: () =>
      generateVaultMayaProofEmail({
        firstName,
        collectionName: VAULT_MAYA_LAUNCH_PROOF.collectionName,
        proofImageUrl: VAULT_MAYA_LAUNCH_PROOF.imageUrl,
      }),
  },
  {
    id: "likeness",
    dueAt: "2026-08-07T07:00:00.000Z",
    expiresAt: "2026-08-08T01:00:00.000Z",
    audience: "eligible",
    email: () => generateVaultMayaLikenessEmail({ firstName }),
  },
  {
    id: "use_cases",
    dueAt: "2026-08-08T07:00:00.000Z",
    expiresAt: "2026-08-09T01:00:00.000Z",
    audience: "eligible",
    email: () => generateVaultMayaUseCasesEmail({ firstName }),
  },
  {
    id: "close",
    dueAt: "2026-08-10T07:00:00.000Z",
    expiresAt: "2026-08-11T01:00:00.000Z",
    audience: "eligible",
    email: () =>
      generateVaultMayaFounderCloseEmail({
        firstName,
        founderDeadline: VAULT_MAYA_LAUNCH_DEADLINE,
      }),
  },
  {
    id: "final_day",
    dueAt: "2026-08-11T04:00:00.000Z",
    expiresAt: "2026-08-11T05:50:00.000Z",
    audience: "eligible",
    email: () =>
      generateVaultMayaFounderFinalDayEmail({
        firstName,
        founderDeadline: VAULT_MAYA_LAUNCH_DEADLINE,
      }),
  },
  {
    id: "final_hours",
    dueAt: "2026-08-11T06:00:00.000Z",
    expiresAt: "2026-08-11T08:00:00.000Z",
    audience: "high-intent",
    email: () =>
      generateVaultMayaFounderFinalHoursEmail({
        firstName,
        founderDeadline: VAULT_MAYA_LAUNCH_DEADLINE,
      }),
  },
]

function segmentId(envName: string): string {
  const value = String(process.env[envName] || "").trim()
  if (!value) throw new Error(`${envName} is required for the Vault Maya launch`)
  return value
}

async function listSegmentCount(id: string): Promise<number> {
  const resend = requireResendClient()
  let after: string | undefined
  let count = 0
  do {
    const { data } = await runResendRequest(
      () =>
        resend.contacts.list({
          segmentId: id,
          limit: 100,
          ...(after ? { after } : {}),
        }),
      false,
    )
    const contacts = data?.data || []
    count += contacts.filter(contact => !contact.unsubscribed).length
    if (!data?.has_more || contacts.length === 0) break
    after = contacts[contacts.length - 1]?.id
    await sleep(RESEND_REQUEST_DELAY_MS)
  } while (after)
  return count
}

async function campaignAlreadySent(campaignKey: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM email_events
    WHERE campaign_key = ${campaignKey}
      AND event_type = 'broadcast_sent'
      AND status = 'success'
    LIMIT 1
  `
  return rows.length > 0
}

async function suppressCurrentSalesExclusions(): Promise<number> {
  const rows = await sql`
    SELECT DISTINCT LOWER(BTRIM(u.email)) AS email
    FROM users u
    JOIN subscriptions s ON s.user_id::text = u.id::text
    WHERE u.email IS NOT NULL
      AND COALESCE(s.is_test_mode, FALSE) = FALSE
      AND (
        (s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro', 'vault_maya')
          AND s.status = 'active')
        OR (s.product_type IN ('suite_trial', 'selfie_visibility_bundle_pass')
          AND s.status = 'active'
          AND s.trial_ends_at > NOW())
      )
  `

  let failed = 0
  for (const row of rows as { email?: string | null }[]) {
    const email = String(row.email || "").trim()
    if (!email) continue
    const result = await removeVaultMayaLaunchSalesContact(email)
    if (!result.success && result.reason !== "segments_not_configured") failed += 1
  }
  if (failed > 0) throw new Error(`Failed to suppress ${failed} protected launch contacts`)
  return rows.length
}

async function sendToSegment(input: {
  campaignKey: string
  segmentId: string
  email: VaultMayaMarketingEmail
}) {
  if (await campaignAlreadySent(input.campaignKey)) return { status: "already_sent" as const }
  const recipientCount = await listSegmentCount(input.segmentId)
  if (recipientCount === 0) return { status: "empty" as const, recipientCount }

  const result = await sendMarketingBroadcast({
    campaignKey: input.campaignKey,
    subject: input.email.subject,
    html: input.email.html,
    text: input.email.text,
    segmentId: input.segmentId,
    estimatedRecipientCount: recipientCount,
  })
  if (result.dryRun) throw new Error(`${input.campaignKey} was suppressed by EMAIL_DRY_RUN`)
  return { status: "sent" as const, recipientCount, broadcastId: result.broadcastId }
}

export async function runDueVaultMayaLaunchFollowups(now = new Date()) {
  const nowMs = now.getTime()
  const due = VAULT_MAYA_LAUNCH_FOLLOWUPS.filter(
    job => nowMs >= new Date(job.dueAt).getTime() && nowMs < new Date(job.expiresAt).getTime(),
  )
  if (due.length === 0) return { due: 0, protectedContacts: 0, results: [] }

  const commerceId = segmentId(VAULT_MAYA_LAUNCH_SEGMENT_ENV.commerce)
  const nonbuyersId = segmentId(VAULT_MAYA_LAUNCH_SEGMENT_ENV.nonbuyers)
  const highIntentId = segmentId(VAULT_MAYA_LAUNCH_SEGMENT_ENV.highIntent)
  const protectedContacts = await suppressCurrentSalesExclusions()
  const results: Array<Record<string, unknown>> = []

  for (const job of due) {
    const email = job.email()
    if (job.audience === "high-intent") {
      results.push({
        job: job.id,
        audience: "high_intent",
        ...(await sendToSegment({
          campaignKey: `vault_maya_launch_${job.id}_high_intent`,
          segmentId: highIntentId,
          email,
        })),
      })
      continue
    }

    results.push({
      job: job.id,
      audience: "commerce",
      ...(await sendToSegment({
        campaignKey: `vault_maya_launch_${job.id}_commerce`,
        segmentId: commerceId,
        email,
      })),
    })
    results.push({
      job: job.id,
      audience: "nonbuyers",
      ...(await sendToSegment({
        campaignKey: `vault_maya_launch_${job.id}_nonbuyers`,
        segmentId: nonbuyersId,
        email,
      })),
    })
  }

  return { due: due.length, protectedContacts, results }
}
