// Resend contact + segment management using the global Contacts model (2025+).
// Legacy callers still pass "tags"; we translate the useful business meaning into
// Contact Properties so old funnels benefit without recreating segment sprawl.

import { requireResendClient } from "@/lib/resend/client"
import { hasResendApiKey } from "@/lib/resend/api-key"

const mainSegmentId = process.env.RESEND_AUDIENCE_ID || ""

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

  const existingAcquisition = normalizeKey(typeof current.acquisition_path === "string" ? current.acquisition_path : undefined)
  merged.acquisition_path = existingAcquisition && existingAcquisition !== "unknown"
    ? existingAcquisition
    : requested.acquisition_path

  const existingStage = normalizeKey(typeof current.lifecycle_stage === "string" ? current.lifecycle_stage : undefined)
  const requestedStage = requested.lifecycle_stage
  if (existingStage && requestedStage) {
    merged.lifecycle_stage = (STAGE_RANK[existingStage] || 0) >= (STAGE_RANK[requestedStage] || 0)
      ? existingStage
      : requestedStage
  } else {
    merged.lifecycle_stage = requestedStage || existingStage
  }

  const existingInterest = normalizeKey(typeof current.primary_interest === "string" ? current.primary_interest : undefined)
  if (existingInterest === "all" || requested.primary_interest === "all") merged.primary_interest = "all"
  else merged.primary_interest = requested.primary_interest || existingInterest

  const existingMembership = normalizeKey(typeof current.membership_status === "string" ? current.membership_status : undefined)
  merged.membership_status = requested.membership_status || existingMembership

  const existingProduct = normalizeKey(typeof current.last_product === "string" ? current.last_product : undefined)
  merged.last_product = requested.last_product || existingProduct

  return Object.fromEntries(Object.entries(merged).filter(([, value]) => Boolean(value))) as LifecycleProperties
}

function isMissingContact(error: any): boolean {
  const message = String(error?.message || "").toLowerCase()
  return error?.statusCode === 404 || message.includes("not found") || message.includes("does not exist")
}

async function ensureMainSegment(email: string): Promise<void> {
  if (!mainSegmentId) return
  const resend = requireResendClient()
  const { error } = await (resend.contacts as any).segments.add({
    email,
    segmentId: mainSegmentId,
  })
  if (error) {
    const message = String(error.message || "").toLowerCase()
    if (!message.includes("already") && !message.includes("duplicate")) {
      throw new Error(error.message || "Failed to add contact to main segment")
    }
  }
}

/**
 * Upsert a global Resend Contact and keep it in the legacy Main Audience segment.
 * Existing opt-out state is never overwritten.
 */
export async function addOrUpdateResendContact(
  email: string,
  firstName: string | null,
  tags: ContactTags,
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    if (!hasResendApiKey()) return { success: false, error: "Resend not configured" }
    if (shouldSkipResend(email)) return { success: true }

    const normalizedEmail = email.trim().toLowerCase()
    const resend = requireResendClient()
    const requested = requestedLifecycleProperties(tags)

    const { data: existing, error: getError } = await (resend.contacts as any).get({ email: normalizedEmail })

    if (existing && !getError) {
      const properties = mergeLifecycleProperties((existing as any).properties, requested)
      const { data, error } = await (resend.contacts as any).update({
        email: normalizedEmail,
        firstName: firstName || undefined,
        properties,
      })
      if (error) return { success: false, error: error.message }
      await ensureMainSegment(normalizedEmail)
      return { success: true, contactId: data?.id || existing.id }
    }

    if (getError && !isMissingContact(getError)) {
      console.warn("[resend] Contact lookup failed before create:", getError)
    }

    const properties = mergeLifecycleProperties(null, requested)
    const createPayload: Record<string, unknown> = {
      email: normalizedEmail,
      firstName: firstName || undefined,
      properties,
    }
    if (mainSegmentId) createPayload.segments = [{ id: mainSegmentId }]

    const { data, error } = await (resend.contacts as any).create(createPayload)
    if (error) {
      const message = String(error.message || "").toLowerCase()
      if (message.includes("already exists") || message.includes("contact already")) {
        const { data: updated, error: updateError } = await (resend.contacts as any).update({
          email: normalizedEmail,
          firstName: firstName || undefined,
          properties,
        })
        if (updateError) return { success: false, error: updateError.message }
        await ensureMainSegment(normalizedEmail)
        return { success: true, contactId: updated?.id }
      }
      return { success: false, error: error.message }
    }

    return { success: true, contactId: data?.id }
  } catch (error) {
    console.error("[resend] Exception syncing lifecycle contact:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Update lifecycle properties on an existing global Contact. Unspecified properties remain unchanged.
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

    const resend = requireResendClient()
    const { error } = await (resend.contacts as any).segments.add({
      email: email.trim().toLowerCase(),
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
