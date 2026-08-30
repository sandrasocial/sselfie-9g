// Resend contact + segment management using the global Contacts model (2025+).
// Legacy callers still pass "tags"; we translate the useful business meaning into
// Contact Properties so old funnels benefit without recreating segment sprawl.

import { isAppUnsubscribed } from "@/lib/email/unsubscribe"
import { acquireKvLock, releaseKvLock } from "@/lib/cache"
import { requireResendClient } from "@/lib/resend/client"
import { hasResendApiKey } from "@/lib/resend/api-key"

function getMainSegmentId(): string {
  // Vercel/dashboard copies can include invisible whitespace. Segment endpoints require a UUID.
  return (process.env.RESEND_AUDIENCE_ID || "").replace(/\r|\n|\t/g, "").trim()
}

const TEST_EMAIL_DOMAINS = new Set([
  "playwright.test",
  "test.local",
  "sselfie.test",
  "sselfie-studio.internal",
  "example.com",
  "yopmail.com",
])

const TEST_LOCAL_PART_PATTERNS = [/^test[-_]/i, /^playwright/i, /^e2e/i, /^debug/i, /^smoke\+/i, /^qa[-_]/i]

function isTestEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  const atIndex = normalized.indexOf("@")
  if (atIndex === -1) return false
  const local = normalized.slice(0, atIndex)
  const domain = normalized.slice(atIndex + 1)

  if (TEST_EMAIL_DOMAINS.has(domain)) return true
  if (domain.endsWith(".test") || domain.endsWith(".local")) return true
  if (TEST_LOCAL_PART_PATTERNS.some((pattern) => pattern.test(local))) return true
  return false
}

function shouldSkipResend(email: string): boolean {
  const disableTestFilter = String(process.env.RESEND_DISABLE_TEST_EMAILS || "").toLowerCase() === "false"
  if (disableTestFilter) return false
  if (process.env.CI === "true") return true
  return isTestEmail(email)
}

export interface ContactTags {
  source?: string
  status?: string
  product?: string
  journey?: string
  acquisition_path?: string
  lifecycle_stage?: string
  primary_interest?: string
  membership_status?: string
  last_product?: string
  [key: string]: string | undefined
}

type LifecycleProperties = {
  acquisition_path?: string
  lifecycle_stage?: string
  primary_interest?: string
  membership_status?: string
  last_product?: string
}

export interface ResendContactSyncOptions {
  /** Minimum delay between provider requests made by one contact upsert. */
  requestIntervalMs?: number
}

type ResendRequestPacer = <T>(request: () => Promise<T>) => Promise<T>

const RESEND_PROVIDER_SLOT_KEY = "rate-limit:resend:provider-request"
const RESEND_PROVIDER_SLOT_TTL_MS = 15_000
const RESEND_PROVIDER_SLOT_WAIT_MS = 100
const RESEND_PROVIDER_SLOT_TIMEOUT_MS = 15_000

let inProcessRequestTail: Promise<void> = Promise.resolve()

async function waitForDistributedResendSlot() {
  const deadline = Date.now() + RESEND_PROVIDER_SLOT_TIMEOUT_MS
  const requireDistributedLock = process.env.VERCEL_ENV === "production"

  while (Date.now() < deadline) {
    const slot = await acquireKvLock({
      key: RESEND_PROVIDER_SLOT_KEY,
      ttlMs: RESEND_PROVIDER_SLOT_TTL_MS,
      requireLockWhenNoRedis: requireDistributedLock,
    })
    if (slot.acquired) return slot
    if (!slot.locked) {
      throw new Error("Distributed Resend request scheduler is not configured")
    }
    await new Promise(resolve => setTimeout(resolve, RESEND_PROVIDER_SLOT_WAIT_MS))
  }

  throw new Error("Timed out waiting for the distributed Resend request scheduler")
}

function createResendRequestPacer(requestIntervalMs = 0): ResendRequestPacer {
  return async request => {
    if (requestIntervalMs <= 0) return request()

    let releaseInProcess!: () => void
    const previousRequest = inProcessRequestTail
    inProcessRequestTail = new Promise(resolve => {
      releaseInProcess = resolve
    })
    await previousRequest

    let distributedSlot: Awaited<ReturnType<typeof waitForDistributedResendSlot>> | null = null
    try {
      distributedSlot = await waitForDistributedResendSlot()
      return await request()
    } finally {
      // Hold the account-wide slot through the cooldown so the next Vercel
      // invocation cannot start another provider call inside the same 500 ms.
      await new Promise(resolve => setTimeout(resolve, requestIntervalMs))
      if (distributedSlot?.locked) {
        await releaseKvLock({
          key: RESEND_PROVIDER_SLOT_KEY,
          value: distributedSlot.value,
        })
      }
      releaseInProcess()
    }
  }
}

const STAGE_RANK: Record<string, number> = {
  lead: 1,
  customer: 2,
  member: 3,
}

function cleanProperty(value: string | undefined): string | undefined {
  const clean = value?.trim()
  return clean ? clean.slice(0, 120) : undefined
}

function normalizeKey(value: string | undefined): string | undefined {
  const clean = cleanProperty(value)
  return clean?.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || undefined
}

/**
 * Resend v6.9.2 returns contact properties from contacts.get as wrappers such as
 * { type: "string", value: "customer" }. Accept that provider shape as well as raw
 * scalar values so an existing customer's state can never be discarded during merge.
 */
function existingPropertyValue(
  current: Record<string, unknown>,
  key: keyof LifecycleProperties,
): string | undefined {
  const raw = current[key]
  if (typeof raw === "string" || typeof raw === "number") return String(raw)
  if (raw && typeof raw === "object" && "value" in raw) {
    const value = (raw as { value?: unknown }).value
    if (typeof value === "string" || typeof value === "number") return String(value)
  }
  return undefined
}

function hasLegacyBuyerSignal(tags: ContactTags): boolean {
  const intent = normalizeKey(tags.ai_photoshoot_intent)
  if (intent === "buyer" || intent === "power_user") return true

  return Object.entries(tags).some(([key, value]) => {
    const normalizedKey = normalizeKey(key)
    const normalizedValue = normalizeKey(value)
    return Boolean(normalizedKey?.startsWith("bought_") && ["true", "yes", "1"].includes(normalizedValue || ""))
  })
}

function inferAcquisitionPath(tags: ContactTags): string | undefined {
  if (tags.acquisition_path) return normalizeKey(tags.acquisition_path)
  const source = normalizeKey(tags.source)
  if (!source) return undefined
  if (source.includes("selfie_guide") || source.includes("freebie_selfie")) return "selfie_guide"
  if (source.includes("ai_prompt") || source.includes("prompt_guide")) return "ai_prompts"
  if (source.includes("manychat")) return "manychat"
  if (source.includes("starter_kit")) return "starter_kit"
  if (source.includes("prompt_vault")) return "prompt_vault"
  if (source.includes("membership") || source.includes("studio") || source.includes("suite")) return "membership"
  return source
}

function inferLifecycleStage(tags: ContactTags): string | undefined {
  if (tags.lifecycle_stage) return normalizeKey(tags.lifecycle_stage)
  const status = normalizeKey(tags.status)
  if (status === "member" || status === "subscriber") return "member"
  if (
    status === "converted" ||
    status === "customer" ||
    status === "purchased" ||
    hasLegacyBuyerSignal(tags)
  ) return "customer"
  if (status === "lead") return "lead"
  return undefined
}

function inferPrimaryInterest(tags: ContactTags): string | undefined {
  if (tags.primary_interest) return normalizeKey(tags.primary_interest)
  const haystack = [tags.source, tags.product, tags.journey]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  if (haystack.includes("prompt") || haystack.includes("ai-photo") || haystack.includes("ai_photo")) return "ai_photos"
  if (haystack.includes("selfie")) return "selfies"
  if (haystack.includes("blueprint") || haystack.includes("content")) return "content"
  if (haystack.includes("studio") || haystack.includes("suite") || haystack.includes("membership")) return "all"
  return undefined
}

function inferLastProduct(tags: ContactTags): string | undefined {
  if (tags.last_product) return normalizeKey(tags.last_product)
  const stage = inferLifecycleStage(tags)
  if (stage !== "customer" && stage !== "member") return undefined
  return normalizeKey(tags.product)
}

function requestedLifecycleProperties(tags: ContactTags): LifecycleProperties {
  return {
    acquisition_path: inferAcquisitionPath(tags),
    lifecycle_stage: inferLifecycleStage(tags),
    primary_interest: inferPrimaryInterest(tags),
    membership_status: normalizeKey(tags.membership_status),
    last_product: inferLastProduct(tags),
  }
}

function mergeLifecycleProperties(
  existing: Record<string, unknown> | null | undefined,
  requested: LifecycleProperties,
): LifecycleProperties {
  const current = existing || {}
  const merged: LifecycleProperties = {}

  const existingAcquisition = normalizeKey(existingPropertyValue(current, "acquisition_path"))
  merged.acquisition_path = existingAcquisition && existingAcquisition !== "unknown"
    ? existingAcquisition
    : requested.acquisition_path

  const existingStage = normalizeKey(existingPropertyValue(current, "lifecycle_stage"))
  const requestedStage = requested.lifecycle_stage
  if (existingStage && requestedStage) {
    merged.lifecycle_stage = (STAGE_RANK[existingStage] || 0) >= (STAGE_RANK[requestedStage] || 0)
      ? existingStage
      : requestedStage
  } else {
    merged.lifecycle_stage = requestedStage || existingStage
  }

  const existingInterest = normalizeKey(existingPropertyValue(current, "primary_interest"))
  if (existingInterest === "all" || requested.primary_interest === "all") merged.primary_interest = "all"
  else merged.primary_interest = requested.primary_interest || existingInterest

  const existingMembership = normalizeKey(existingPropertyValue(current, "membership_status"))
  merged.membership_status = requested.membership_status || existingMembership

  const existingProduct = normalizeKey(existingPropertyValue(current, "last_product"))
  merged.last_product = requested.last_product || existingProduct

  return Object.fromEntries(Object.entries(merged).filter(([, value]) => Boolean(value))) as LifecycleProperties
}

function isMissingContact(error: any): boolean {
  const message = String(error?.message || "").toLowerCase()
  return error?.statusCode === 404 || message.includes("not found") || message.includes("does not exist")
}

async function ensureMainSegment(email: string, paceRequest: ResendRequestPacer): Promise<void> {
  const mainSegmentId = getMainSegmentId()
  if (!mainSegmentId) return
  const resend = requireResendClient()
  const { error } = await paceRequest(() =>
    (resend.contacts as any).segments.add({
      email,
      segmentId: mainSegmentId,
    })
  )
  if (error) {
    const message = String(error.message || "").toLowerCase()
    if (!message.includes("already") && !message.includes("duplicate")) {
      throw new Error(error.message || "Failed to add contact to main segment")
    }
  }
}

/**
 * Upsert a global Resend Contact and keep it in the legacy Main Audience segment.
 * Existing opt-out state is never overwritten and app-level opt-outs are never re-added.
 */
export async function addOrUpdateResendContact(
  email: string,
  firstName: string | null,
  tags: ContactTags,
  options: ResendContactSyncOptions = {},
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    if (!hasResendApiKey()) return { success: false, error: "Resend not configured" }
    if (shouldSkipResend(email)) return { success: true }

    const normalizedEmail = email.trim().toLowerCase()
    if (await isAppUnsubscribed(normalizedEmail)) {
      return { success: true }
    }

    const resend = requireResendClient()
    const requested = requestedLifecycleProperties(tags)
    const paceRequest = createResendRequestPacer(options.requestIntervalMs)

    const { data: existing, error: getError } = await paceRequest(() =>
      (resend.contacts as any).get({ email: normalizedEmail })
    )

    if (existing && !getError) {
      const properties = mergeLifecycleProperties((existing as any).properties, requested)
      const { data, error } = await paceRequest(() =>
        (resend.contacts as any).update({
          email: normalizedEmail,
          firstName: firstName || undefined,
          properties,
        })
      )
      if (error) return { success: false, error: error.message }

      // A global Resend opt-out must never be re-segmented by a data backfill.
      if ((existing as any).unsubscribed !== true) {
        await ensureMainSegment(normalizedEmail, paceRequest)
      }
      return { success: true, contactId: data?.id || existing.id }
    }

    if (getError && !isMissingContact(getError)) {
      console.warn("[resend] Contact lookup failed before create:", getError)
    }

    const properties = mergeLifecycleProperties(null, requested)
    const createPayload = {
      email: normalizedEmail,
      firstName: firstName || undefined,
      properties,
    }

    const { data, error } = await paceRequest(() =>
      (resend.contacts as any).create(createPayload)
    )
    if (error) {
      const message = String(error.message || "").toLowerCase()
      if (message.includes("already exists") || message.includes("contact already")) {
        const { data: current } = await paceRequest(() =>
          (resend.contacts as any).get({ email: normalizedEmail })
        )
        const mergedProperties = mergeLifecycleProperties((current as any)?.properties, requested)
        const { data: updated, error: updateError } = await paceRequest(() =>
          (resend.contacts as any).update({
            email: normalizedEmail,
            firstName: firstName || undefined,
            properties: mergedProperties,
          })
        )
        if (updateError) return { success: false, error: updateError.message }
        if ((current as any)?.unsubscribed !== true) {
          await ensureMainSegment(normalizedEmail, paceRequest)
        }
        return { success: true, contactId: updated?.id || current?.id }
      }
      return { success: false, error: error.message }
    }

    // Keep contact creation independent from segment assignment. The provider currently rejects
    // the otherwise documented inline `segments: [{ id }]` create shape for this production path.
    // Adding the newly created global Contact through the dedicated endpoint preserves Main
    // Audience membership without risking another create-only 422.
    await ensureMainSegment(normalizedEmail, paceRequest)
    return { success: true, contactId: data?.id }
  } catch (error) {
    console.error("[resend] Exception syncing lifecycle contact:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Update lifecycle properties on an existing global Contact. Unspecified properties remain unchanged.
 * This never creates or re-subscribes a marketing contact.
 */
export async function updateContactTags(
  email: string,
  newTags: ContactTags,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!hasResendApiKey()) return { success: false, error: "Resend not configured" }
    if (shouldSkipResend(email)) return { success: true }

    const normalizedEmail = email.trim().toLowerCase()
    const resend = requireResendClient()
    const { data: existing, error: getError } = await (resend.contacts as any).get({ email: normalizedEmail })
    if (getError || !existing) return { success: false, error: getError?.message || "Contact not found" }

    const properties = mergeLifecycleProperties((existing as any).properties, requestedLifecycleProperties(newTags))
    const { error } = await (resend.contacts as any).update({
      email: normalizedEmail,
      properties,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error) {
    console.error("[resend] Exception updating lifecycle properties:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/** Remove from the Main Audience segment without deleting the global Contact. */
export async function removeResendContact(email: string): Promise<{ success: boolean; error?: string }> {
  const mainSegmentId = getMainSegmentId()
  if (!mainSegmentId) return { success: true }
  return removeContactFromSegment(email, mainSegmentId)
}

export async function addContactToSegment(
  email: string,
  segmentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!hasResendApiKey()) return { success: false, error: "Resend not configured" }
    if (shouldSkipResend(email)) return { success: true }

    const normalizedEmail = email.trim().toLowerCase()
    if (await isAppUnsubscribed(normalizedEmail)) return { success: true }

    const resend = requireResendClient()
    const { data: existing } = await (resend.contacts as any).get({ email: normalizedEmail })
    if ((existing as any)?.unsubscribed === true) return { success: true }

    const { error } = await (resend.contacts as any).segments.add({
      email: normalizedEmail,
      segmentId,
    })
    if (error) {
      const message = String(error.message || "").toLowerCase()
      if (message.includes("already") || message.includes("duplicate")) return { success: true }
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    console.error("[resend] Exception adding contact to segment:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function removeContactFromSegment(
  email: string,
  segmentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!hasResendApiKey()) return { success: false, error: "Resend not configured" }
    if (shouldSkipResend(email)) return { success: true }

    const resend = requireResendClient()
    const { error } = await (resend.contacts as any).segments.remove({
      email: email.trim().toLowerCase(),
      segmentId,
    })
    if (error) {
      const message = String(error.message || "").toLowerCase()
      if (message.includes("not found") || message.includes("missing")) return { success: true }
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    console.error("[resend] Exception removing contact from segment:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
