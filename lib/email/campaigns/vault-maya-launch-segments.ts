import { sql } from "@/lib/db/client"
import { requireResendClient } from "@/lib/resend/client"

export const VAULT_MAYA_LAUNCH_SEGMENT_ENV = {
  suite: "RESEND_SEGMENT_VAULT_MAYA_LAUNCH_SUITE",
  commerce: "RESEND_SEGMENT_VAULT_MAYA_LAUNCH_COMMERCE",
  nonbuyers: "RESEND_SEGMENT_VAULT_MAYA_LAUNCH_NONBUYERS",
  highIntent: "RESEND_SEGMENT_VAULT_MAYA_LAUNCH_HIGH_INTENT",
} as const

type SegmentActionResult = {
  success: boolean
  changed: number
  skipped: boolean
  reason?: string
}

export const RESEND_REQUEST_DELAY_MS = 560
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function normalizeEmail(email: string): string | null {
  const normalized = String(email || "").trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null
}

function readSegmentId(envName: string): string {
  return String(process.env[envName] || "").trim()
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  return `${local.slice(0, 2)}***@${domain}`
}

export function isVaultMayaLaunchCampaignKey(value?: string | null): boolean {
  return String(value || "")
    .trim()
    .toLowerCase()
    .startsWith("vault_maya_launch_")
}

export function isVaultMayaOfferClickUrl(value?: string | null): boolean {
  if (!value) return false

  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    if (hostname !== "sselfie.ai" && hostname !== "www.sselfie.ai") return false

    const pathname = url.pathname.replace(/\/+$/, "") || "/"
    return pathname === "/vault-maya" || pathname === "/checkout/vault-maya"
  } catch {
    return false
  }
}

async function hasVaultMayaSalesExclusion(email: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM users u
    JOIN subscriptions s ON s.user_id::text = u.id::text
    WHERE LOWER(BTRIM(u.email)) = ${email}
      AND COALESCE(s.is_test_mode, FALSE) = FALSE
      AND (
        (s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro', 'vault_maya')
          AND s.status = 'active')
        OR (s.product_type IN ('suite_trial', 'selfie_visibility_bundle_pass')
          AND s.status = 'active'
          AND s.trial_ends_at > NOW())
      )
    LIMIT 1
  `
  return rows.length > 0
}

export async function runResendRequest<T extends { error: { message?: string } | null }>(
  request: () => Promise<T>,
  allowMissing: boolean,
  wait: (ms: number) => Promise<unknown> = sleep,
): Promise<T> {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const result = await request()
    const { error } = result
    if (!error) return result

    const message = String(error.message || "")
    if (allowMissing && /not found|does not exist|404/i.test(message)) return result
    if (!/429|rate|too many/i.test(message) || attempt === 6) {
      throw new Error(message || "Resend segment request failed")
    }
    await wait(Math.min(10_000, 800 * 2 ** (attempt - 1)))
  }

  throw new Error("Resend segment request exhausted retries")
}

async function addToSegment(email: string, segmentId: string): Promise<void> {
  const resend = requireResendClient()
  await runResendRequest(
    () => resend.contacts.segments.add({ email, segmentId }),
    false,
  )
}

async function removeFromSegment(email: string, segmentId: string): Promise<void> {
  const resend = requireResendClient()
  await runResendRequest(
    () => resend.contacts.segments.remove({ email, segmentId }),
    true,
  )
}

/**
 * Add a real launch clicker or checkout starter to the final-hours segment.
 * Paid Vault members and anyone with current SUITE-level access are always excluded.
 */
export async function addVaultMayaLaunchHighIntent(
  rawEmail: string,
): Promise<SegmentActionResult> {
  const email = normalizeEmail(rawEmail)
  if (!email) return { success: false, changed: 0, skipped: true, reason: "invalid_email" }

  const segmentId = readSegmentId(VAULT_MAYA_LAUNCH_SEGMENT_ENV.highIntent)
  if (!segmentId) {
    console.warn("[vault-maya-launch] high-intent segment is not configured")
    return { success: false, changed: 0, skipped: true, reason: "segment_not_configured" }
  }

  if (await hasVaultMayaSalesExclusion(email)) {
    return { success: true, changed: 0, skipped: true, reason: "sales_excluded" }
  }

  try {
    await addToSegment(email, segmentId)
    return { success: true, changed: 1, skipped: false }
  } catch (error) {
    console.error("[vault-maya-launch] failed to add high-intent contact", {
      email: maskEmail(email),
      error: error instanceof Error ? error.message : "unknown error",
    })
    return { success: false, changed: 0, skipped: false, reason: "provider_error" }
  }
}

/** Remove a new Vault Maya buyer or SUITE member from every Vault Maya sales segment. */
export async function removeVaultMayaLaunchSalesContact(
  rawEmail: string,
): Promise<SegmentActionResult> {
  const email = normalizeEmail(rawEmail)
  if (!email) return { success: false, changed: 0, skipped: true, reason: "invalid_email" }

  const segmentIds = [
    readSegmentId(VAULT_MAYA_LAUNCH_SEGMENT_ENV.commerce),
    readSegmentId(VAULT_MAYA_LAUNCH_SEGMENT_ENV.nonbuyers),
    readSegmentId(VAULT_MAYA_LAUNCH_SEGMENT_ENV.highIntent),
  ].filter(Boolean)

  if (segmentIds.length === 0) {
    console.warn("[vault-maya-launch] sales segments are not configured")
    return { success: false, changed: 0, skipped: true, reason: "segments_not_configured" }
  }

  let changed = 0
  let failed = false
  for (const [index, segmentId] of segmentIds.entries()) {
    try {
      await removeFromSegment(email, segmentId)
      changed += 1
    } catch (error) {
      failed = true
      console.error("[vault-maya-launch] failed to remove buyer from sales segment", {
        email: maskEmail(email),
        error: error instanceof Error ? error.message : "unknown error",
      })
    }
    if (index < segmentIds.length - 1) await sleep(RESEND_REQUEST_DELAY_MS)
  }

  return {
    success: !failed,
    changed,
    skipped: false,
    ...(failed ? { reason: "provider_error" } : {}),
  }
}
