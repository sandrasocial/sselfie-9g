import { NextResponse } from "next/server"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { logAdminError } from "@/lib/admin-error-log"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { SELFIE_GUIDE_EMAIL_TOUCHES } from "@/lib/email/selfie-guide-email-sequence"
import { FREEBIE_GUIDE_EMAIL_TOUCHES } from "@/lib/email/freebie-guide-email-sequence"
import { AI_PROMPTS_EMAIL_TOUCHES } from "@/lib/email/ai-prompts-email-sequence"
import { PROMPT_VAULT_EMAIL_TOUCHES } from "@/lib/email/prompt-vault-email-sequence"
import { SELFIE_TO_BRAND_SHOOT_EMAIL_TOUCHES } from "@/lib/email/selfie-to-brand-shoot-email-sequence"
import { STARTER_KIT_EMAIL_TOUCHES } from "@/lib/email/starter-kit-email-sequence"
import { MASTERCLASS_EMAIL_TOUCHES } from "@/lib/email/masterclass-email-sequence"
import { generateFreebieGuideDay1LightTipEmail } from "@/lib/email/templates/freebie-guide-day1-light-tip"
import { generateFreebieGuideDay3EditBridgeEmail } from "@/lib/email/templates/freebie-guide-day3-edit-bridge"
import { generateFreebieGuideDay5StoryEmail } from "@/lib/email/templates/freebie-guide-day5-story"
import { generateFreebieGuideDay8StarterKitDirectEmail } from "@/lib/email/templates/freebie-guide-day8-starter-kit-direct"
import { generateFreebieGuideDay14MasterclassBridgeEmail } from "@/lib/email/templates/freebie-guide-day14-masterclass-bridge"
import { generateSelfieGuideActivationDay0Email } from "@/lib/email/templates/selfie-guide-activation-day0"
import { generateSelfieGuideDay3CheckinEmail } from "@/lib/email/templates/selfie-guide-day3-checkin"
import { generateSelfieGuideDay7ChallengeEmail } from "@/lib/email/templates/selfie-guide-day7-challenge"
import { generateSelfieGuideDay14MayaBridgeEmail } from "@/lib/email/templates/selfie-guide-day14-maya-bridge"
import { generateSelfieGuideDay21FinalEmail } from "@/lib/email/templates/selfie-guide-day21-final"
import { generateStarterKitDay0DeliveryEmail } from "@/lib/email/templates/starter-kit-day0-delivery"
import { generateStarterKitDay1QuickWinEmail } from "@/lib/email/templates/starter-kit-day1-quick-win"
import { generateStarterKitDay3StoryEmail } from "@/lib/email/templates/starter-kit-day3-story"
import { generateStarterKitDay5ProofEmail } from "@/lib/email/templates/starter-kit-day5-proof"
import { generateStarterKitDay7SoftMasterclassEmail } from "@/lib/email/templates/starter-kit-day7-soft-masterclass"
import { generateStarterKitDay10MasterclassBreakdownEmail } from "@/lib/email/templates/starter-kit-day10-masterclass-breakdown"
import { generateStarterKitDay14MasterclassOfferEmail } from "@/lib/email/templates/starter-kit-day14-masterclass-offer"
import { generateMasterclassDay0DeliveryEmail } from "@/lib/email/templates/masterclass-day0-delivery"
import { generateMasterclassDay2CheckinEmail } from "@/lib/email/templates/masterclass-day2-checkin"
import { generateMasterclassDay5DeepenEmail } from "@/lib/email/templates/masterclass-day5-deepen"
import { generateMasterclassDay7SoftWorkWithMeEmail } from "@/lib/email/templates/masterclass-day7-soft-work-with-me"
import { generateMasterclassDay10DirectInviteEmail } from "@/lib/email/templates/masterclass-day10-direct-invite"
import { generateAiPromptsDay1VaultBridgeEmail } from "@/lib/email/templates/ai-prompts-day1-vault-bridge"
import { generateAiPromptsDay2TryFirstPromptEmail } from "@/lib/email/templates/ai-prompts-day2-try-first-prompt"
import { generateAiPromptsDay5EditMakesPostableEmail } from "@/lib/email/templates/ai-prompts-day5-edit-makes-postable"
import { generateAiPromptsDay7PromptVaultOfferEmail } from "@/lib/email/templates/ai-prompts-day7-prompt-vault-offer"
import { generateAiPromptsDay9PromptVaultProofEmail } from "@/lib/email/templates/ai-prompts-day9-prompt-vault-proof"
import { generateAiPromptsDay11PromptVaultWhyNowEmail } from "@/lib/email/templates/ai-prompts-day11-prompt-vault-why-now"
import { generateAiPromptsDay10SuiteTrialEmail } from "@/lib/email/templates/ai-prompts-day10-suite-trial"
import {
  generatePromptVaultDay10NextShootEmail,
  generatePromptVaultDay2FirstResultEmail,
  generatePromptVaultDay3SystemUpgradeEmail,
  generatePromptVaultDay5FixBadResultEmail,
} from "@/lib/email/templates/prompt-vault-buyer-sequence"
import {
  generateSelfieToBrandShootDay1SourceAndWorldEmail,
  generateSelfieToBrandShootDay3FirstShootEmail,
  generateSelfieToBrandShootDay5SelectAndContentEmail,
  generateSelfieToBrandShootDay7ProofRequestEmail,
} from "@/lib/email/templates/selfie-to-brand-shoot-buyer-sequence"

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
  .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
  .replace(/\/+$/, "")
const STARTER_KIT_FALLBACK_URL = `${SITE_URL}/starter-kit`
const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"
const AI_PROMPTS_NURTURE_SAFE_DEFAULT_START_DATE = "2026-05-18"

interface SelfieGuideActivationCandidate {
  email: string
  name: string | null
  access_token: string | null
  subscription_created_at: string
}

interface SelfieGuideTouchCandidate {
  email: string
  name: string | null
  access_token: string | null
  subscription_created_at: string
}

interface FreebieGuideTouchCandidate {
  email: string
  name: string | null
  access_token: string | null
  created_at: string
}

interface AiPromptsTouchCandidate {
  email: string
  name: string | null
  access_token: string | null
  created_at: string
}

interface PromptVaultTouchCandidate {
  email: string
  name: string | null
  access_token: string | null
  converted_at: string | null
  created_at: string
}

interface SelfieToBrandShootTouchCandidate {
  email: string
  name: string | null
  access_token: string | null
  converted_at: string | null
  created_at: string
}

interface StarterKitCandidate {
  email: string
  name: string | null
  access_token: string | null
  subscription_created_at: string
}

interface MasterclassCandidate {
  email: string
  name: string | null
  subscription_created_at: string
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "unknown"
}

function selfieGuideAccessUrl(candidate: { access_token: string | null }): string {
  const token = typeof candidate.access_token === "string" ? candidate.access_token.trim() : ""
  return token.length > 0 ? `${SITE_URL}/selfie-guide/access/${token}` : `${SITE_URL}/selfie-guide`
}

function aiPromptsAccessUrl(candidate: { access_token: string | null }): string {
  const token = typeof candidate.access_token === "string" ? candidate.access_token.trim() : ""
  return token.length > 0 ? `${SITE_URL}/ai-prompts/access/${token}` : `${SITE_URL}/ai-prompts`
}

function promptVaultAccessUrl(candidate: { access_token: string | null }): string {
  const token = typeof candidate.access_token === "string" ? candidate.access_token.trim() : ""
  return token.length > 0 ? `${SITE_URL}/access/prompt-vault/${token}` : `${SITE_URL}/prompt-vault`
}

function selfieToBrandShootAccessUrl(candidate: { access_token: string | null }): string {
  const token = typeof candidate.access_token === "string" ? candidate.access_token.trim() : ""
  return token.length > 0
    ? `${SITE_URL}/access/selfie-to-brand-shoot/${token}`
    : `${SITE_URL}/academy/access/selfie-to-brand-shoot`
}

// BRIDGE-01: the 7-day SUITE trial claim link (one trial per person, ever — the claim
// page enforces it, so sending the link repeatedly is safe).
function suiteTrialClaimUrl(candidate: { access_token: string | null }): string | undefined {
  const token = typeof candidate.access_token === "string" ? candidate.access_token.trim() : ""
  return token.length > 0 ? `${SITE_URL}/claim/${token}` : undefined
}

function aiPromptsNurtureStartDate(): string {
  const configured = process.env.AI_PROMPTS_NURTURE_START_DATE?.trim()

  if (configured && /^\d{4}-\d{2}-\d{2}$/.test(configured)) {
    return configured
  }

  return AI_PROMPTS_NURTURE_SAFE_DEFAULT_START_DATE
}

async function getSelfieGuideActivationCandidates(): Promise<SelfieGuideActivationCandidate[]> {
  return (await sql`
    SELECT DISTINCT ON (LOWER(u.email))
      u.email,
      COALESCE(NULLIF(BTRIM(fs.name), ''), NULLIF(BTRIM(u.display_name), '')) AS name,
      fs.access_token,
      s.created_at AS subscription_created_at
    FROM subscriptions s
    INNER JOIN users u ON u.id::varchar = s.user_id
    INNER JOIN freebie_subscribers fs ON LOWER(fs.email) = LOWER(u.email)
    WHERE s.product_type IN ('selfie_guide', 'selfie_guide_bundle')
      AND s.status = 'active'
      AND s.created_at <= NOW()
      AND s.created_at > NOW() - INTERVAL '3 days'
      AND u.email IS NOT NULL
      AND u.email <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(u.email)
          AND el.email_type = 'selfie-guide-activation-day0'
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(u.email), s.created_at DESC
    LIMIT 200
  `) as SelfieGuideActivationCandidate[]
}

async function getSelfieGuideTouchCandidates(
  days: number,
  emailType: string
): Promise<SelfieGuideTouchCandidate[]> {
  return (await sql`
    SELECT DISTINCT ON (LOWER(u.email))
      u.email,
      COALESCE(NULLIF(BTRIM(fs.name), ''), NULLIF(BTRIM(u.display_name), '')) AS name,
      fs.access_token,
      s.created_at AS subscription_created_at
    FROM subscriptions s
    INNER JOIN users u ON u.id::varchar = s.user_id
    INNER JOIN freebie_subscribers fs ON LOWER(fs.email) = LOWER(u.email)
    WHERE s.product_type IN ('selfie_guide', 'selfie_guide_bundle')
      AND s.status = 'active'
      AND s.created_at <= NOW() - (${`${days} days`}::interval)
      AND u.email IS NOT NULL
      AND u.email <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(u.email)
          AND el.email_type = ${emailType}
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(u.email), s.created_at DESC
    LIMIT 200
  `) as SelfieGuideTouchCandidate[]
}

async function getFreebieGuideTouchCandidates(
  days: number,
  emailType: string
): Promise<FreebieGuideTouchCandidate[]> {
  return (await sql`
    SELECT DISTINCT ON (LOWER(fs.email))
      fs.email,
      NULLIF(BTRIM(fs.name), '') AS name,
      fs.access_token,
      fs.created_at
    FROM freebie_subscribers fs
    WHERE fs.created_at <= NOW() - (${`${days} days`}::interval)
      AND fs.email IS NOT NULL
      AND fs.email <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(fs.email)
          AND el.email_type = ${emailType}
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(fs.email), fs.created_at DESC
    LIMIT 200
  `) as FreebieGuideTouchCandidate[]
}

async function getAiPromptsTouchCandidates(
  days: number,
  emailType: string,
  startDate: string,
  suppressIfSentTypes: string[] = []
): Promise<AiPromptsTouchCandidate[]> {
  const sentEmailTypes = [emailType, ...suppressIfSentTypes]

  return (await sql`
    SELECT DISTINCT ON (LOWER(fs.email))
      fs.email,
      NULLIF(BTRIM(fs.name), '') AS name,
      fs.access_token,
      fs.created_at
    FROM freebie_subscribers fs
    WHERE fs.created_at <= NOW() - (${`${days} days`}::interval)
      AND fs.created_at >= ${startDate}::date
      AND fs.email IS NOT NULL
      AND fs.email <> ''
      AND (
        fs.source = 'ai-prompts'
        OR 'ai-prompts-subscriber' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
      AND NOT (
        'prompt-vault-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        OR 'bought_prompt_vault' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        OR 'starter-kit-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        OR 'bought_starter_kit' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
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
    ORDER BY LOWER(fs.email), fs.created_at DESC
    LIMIT 200
  `) as AiPromptsTouchCandidate[]
}

async function getPromptVaultTouchCandidates(
  days: number,
  emailType: string
): Promise<PromptVaultTouchCandidate[]> {
  return (await sql`
    SELECT DISTINCT ON (LOWER(fs.email))
      fs.email,
      NULLIF(BTRIM(fs.name), '') AS name,
      fs.access_token,
      fs.converted_at,
      fs.created_at
    FROM freebie_subscribers fs
    WHERE COALESCE(fs.converted_at, fs.updated_at, fs.created_at) <= NOW() - (${`${days} days`}::interval)
      AND fs.email IS NOT NULL
      AND fs.email <> ''
      AND (
        fs.source = 'prompt-vault-paid'
        OR 'prompt-vault-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(fs.email)
          AND el.email_type = ${emailType}
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(fs.email), COALESCE(fs.converted_at, fs.updated_at, fs.created_at) DESC
    LIMIT 200
  `) as PromptVaultTouchCandidate[]
}

async function getSelfieToBrandShootTouchCandidates(
  days: number,
  emailType: string
): Promise<SelfieToBrandShootTouchCandidate[]> {
  return (await sql`
    SELECT DISTINCT ON (LOWER(fs.email))
      fs.email,
      NULLIF(BTRIM(fs.name), '') AS name,
      fs.access_token,
      fs.converted_at,
      fs.created_at
    FROM freebie_subscribers fs
    WHERE COALESCE(fs.converted_at, fs.updated_at, fs.created_at) <= NOW() - (${`${days} days`}::interval)
      AND fs.email IS NOT NULL
      AND fs.email <> ''
      AND (
        fs.source = 'selfie-to-brand-shoot-paid'
        OR 'selfie-to-brand-shoot-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
        OR 'bought_selfie_to_brand_shoot_system' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(fs.email)
          AND el.email_type = ${emailType}
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(fs.email), COALESCE(fs.converted_at, fs.updated_at, fs.created_at) DESC
    LIMIT 200
  `) as SelfieToBrandShootTouchCandidate[]
}

async function getStarterKitCandidates(
  days: number,
  emailType: string
): Promise<StarterKitCandidate[]> {
  return (await sql`
    SELECT DISTINCT ON (LOWER(u.email))
      u.email,
      COALESCE(NULLIF(BTRIM(fs.name), ''), NULLIF(BTRIM(u.display_name), '')) AS name,
      fs.access_token,
      s.created_at AS subscription_created_at
    FROM subscriptions s
    INNER JOIN users u ON u.id::varchar = s.user_id
    LEFT JOIN freebie_subscribers fs ON LOWER(fs.email) = LOWER(u.email)
    WHERE s.product_type = 'starter_kit'
      AND s.status = 'active'
      AND s.created_at <= NOW() - (${`${days} days`}::interval)
      AND u.email IS NOT NULL
      AND u.email <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(u.email)
          AND el.email_type = ${emailType}
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(u.email), s.created_at DESC
    LIMIT 200
  `) as StarterKitCandidate[]
}

async function getMasterclassCandidates(
  days: number,
  emailType: string
): Promise<MasterclassCandidate[]> {
  return (await sql`
    SELECT DISTINCT ON (LOWER(u.email))
      u.email,
      NULLIF(BTRIM(u.display_name), '') AS name,
      s.created_at AS subscription_created_at
    FROM subscriptions s
    INNER JOIN users u ON u.id::varchar = s.user_id
    WHERE s.product_type = 'masterclass'
      AND s.status = 'active'
      AND s.created_at <= NOW() - (${`${days} days`}::interval)
      AND u.email IS NOT NULL
      AND u.email <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(el.user_email) = LOWER(u.email)
          AND el.email_type = ${emailType}
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY LOWER(u.email), s.created_at DESC
    LIMIT 200
  `) as MasterclassCandidate[]
}

function formatExpiryDate(subscriptionCreatedAt: string, daysAfterPurchase: number): string {
  const purchaseDate = new Date(subscriptionCreatedAt)
  const expiryDate = new Date(purchaseDate.getTime() + daysAfterPurchase * 24 * 60 * 60 * 1000)
  return expiryDate.toLocaleDateString("en-GB", { month: "long", day: "numeric" })
}

async function sendSelfieGuideTouchEmail(
  emailType: string,
  candidate: SelfieGuideTouchCandidate,
  accessUrl: string
) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })

  let email: { html: string; text: string; subject: string }

  switch (emailType) {
    case "selfie-guide-day3-checkin":
      email = generateSelfieGuideDay3CheckinEmail({
        firstName,
        recipientEmail: candidate.email,
        accessUrl,
      })
      break
    case "selfie-guide-day7-challenge":
      email = generateSelfieGuideDay7ChallengeEmail({
        firstName,
        recipientEmail: candidate.email,
        accessUrl,
      })
      break
    case "selfie-guide-day14-maya-bridge":
      email = generateSelfieGuideDay14MayaBridgeEmail({
        firstName,
        recipientEmail: candidate.email,
        accessUrl,
      })
      break
    case "selfie-guide-day21-final": {
      const expiryDate = formatExpiryDate(candidate.subscription_created_at, 28)
      email = generateSelfieGuideDay21FinalEmail({
        firstName,
        recipientEmail: candidate.email,
        accessUrl,
        expiryDate,
      })
      break
    }
    default:
      throw new Error(`Unknown selfie guide email type: ${emailType}`)
  }

  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType,
    tags: ["selfie-guide", emailType],
    marketing: true,
  })
}

async function sendFreebieGuideTouchEmail(
  emailType: string,
  candidate: FreebieGuideTouchCandidate,
  accessUrl: string
) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })

  let email: { html: string; text: string; subject: string }

  switch (emailType) {
    case "freebie-guide-day1-light-tip":
      email = generateFreebieGuideDay1LightTipEmail({
        firstName,
        recipientEmail: candidate.email,
        accessUrl,
      })
      break
    case "freebie-guide-day3-edit-bridge":
      email = generateFreebieGuideDay3EditBridgeEmail({
        firstName,
        recipientEmail: candidate.email,
        accessUrl,
      })
      break
    case "freebie-guide-day5-story":
      email = generateFreebieGuideDay5StoryEmail({
        firstName,
        recipientEmail: candidate.email,
        accessUrl,
      })
      break
    case "freebie-guide-day8-starter-kit-direct":
      email = generateFreebieGuideDay8StarterKitDirectEmail({
        firstName,
        recipientEmail: candidate.email,
        accessUrl,
      })
      break
    case "freebie-guide-day14-masterclass-bridge":
      email = generateFreebieGuideDay14MasterclassBridgeEmail({
        firstName,
        recipientEmail: candidate.email,
        accessUrl,
        claimUrl: suiteTrialClaimUrl(candidate),
      })
      break
    default:
      throw new Error(`Unknown freebie guide email type: ${emailType}`)
  }

  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType,
    tags: ["freebie-guide", emailType],
    marketing: true,
  })
}

async function sendAiPromptsTouchEmail(
  emailType: string,
  candidate: AiPromptsTouchCandidate,
  accessUrl: string
) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })

  let email: { html: string; text: string; subject: string }

  switch (emailType) {
    case "ai-prompts-day1-vault-bridge":
      email = generateAiPromptsDay1VaultBridgeEmail({ firstName, recipientEmail: candidate.email })
      break
    case "ai-prompts-day2-try-first-prompt":
      email = generateAiPromptsDay2TryFirstPromptEmail({ firstName, accessUrl })
      break
    case "ai-prompts-day5-edit-makes-postable":
      email = generateAiPromptsDay5EditMakesPostableEmail({
        firstName,
        accessUrl,
        recipientEmail: candidate.email,
      })
      break
    case "ai-prompts-day7-prompt-vault-offer":
      email = generateAiPromptsDay7PromptVaultOfferEmail({
        firstName,
        recipientEmail: candidate.email,
      })
      break
    case "ai-prompts-day9-prompt-vault-proof":
      email = generateAiPromptsDay9PromptVaultProofEmail({
        firstName,
        recipientEmail: candidate.email,
      })
      break
    case "ai-prompts-day11-prompt-vault-why-now":
      email = generateAiPromptsDay11PromptVaultWhyNowEmail({
        firstName,
        recipientEmail: candidate.email,
      })
      break
    case "ai-prompts-day10-suite-trial": {
      const claimUrl = suiteTrialClaimUrl(candidate)
      if (!claimUrl) {
        throw new Error("Missing suite trial claim token")
      }
      email = generateAiPromptsDay10SuiteTrialEmail({ firstName, claimUrl })
      break
    }
    default:
      throw new Error(`Unknown AI Prompts email type: ${emailType}`)
  }

  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType,
    tags: ["ai-prompts", emailType],
    marketing: true,
  })
}

async function sendPromptVaultTouchEmail(
  emailType: string,
  candidate: PromptVaultTouchCandidate,
  accessUrl: string
) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })

  let email: { html: string; text: string; subject: string }

  switch (emailType) {
    case "prompt-vault-day2-first-result":
      email = generatePromptVaultDay2FirstResultEmail({ firstName, accessUrl })
      break
    case "prompt-vault-day3-system-upgrade":
      email = generatePromptVaultDay3SystemUpgradeEmail({
        firstName,
        accessUrl,
        recipientEmail: candidate.email,
      })
      break
    case "prompt-vault-day5-fix-bad-result":
      email = generatePromptVaultDay5FixBadResultEmail({ firstName, accessUrl })
      break
    case "prompt-vault-day10-next-shoot":
      email = generatePromptVaultDay10NextShootEmail({ firstName, accessUrl })
      break
    default:
      throw new Error(`Unknown Prompt Vault email type: ${emailType}`)
  }

  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType,
    tags: ["prompt-vault", emailType],
    marketing: true,
  })
}

async function sendSelfieToBrandShootTouchEmail(
  emailType: string,
  candidate: SelfieToBrandShootTouchCandidate,
  accessUrl: string
) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })

  let email: { html: string; text: string; subject: string }

  switch (emailType) {
    case "selfie-to-brand-shoot-day1-source-and-world":
      email = generateSelfieToBrandShootDay1SourceAndWorldEmail({ firstName, accessUrl })
      break
    case "selfie-to-brand-shoot-day3-first-shoot":
      email = generateSelfieToBrandShootDay3FirstShootEmail({ firstName, accessUrl })
      break
    case "selfie-to-brand-shoot-day5-select-and-content":
      email = generateSelfieToBrandShootDay5SelectAndContentEmail({ firstName, accessUrl })
      break
    case "selfie-to-brand-shoot-day7-proof-request":
      email = generateSelfieToBrandShootDay7ProofRequestEmail({ firstName, accessUrl })
      break
    default:
      throw new Error(`Unknown Selfie to Brand Shoot email type: ${emailType}`)
  }

  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType,
    tags: ["selfie-to-brand-shoot", emailType],
    marketing: true,
  })
}

function starterKitAccessUrl(_candidate: StarterKitCandidate): string {
  const token = typeof _candidate.access_token === "string" ? _candidate.access_token.trim() : ""
  return token.length > 0 ? `${SITE_URL}/access/starter-kit/${token}` : STARTER_KIT_FALLBACK_URL
}

function masterclassAccessUrl(_candidate: MasterclassCandidate): string {
  // Masterclass content lives inside the authenticated Academy — send buyers there, not back to the landing page
  return `${SITE_URL}/academy`
}

async function sendStarterKitTouchEmail(
  emailType: string,
  candidate: StarterKitCandidate,
  accessUrl: string
) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })

  let email: { html: string; text: string; subject: string }

  switch (emailType) {
    case "starter-kit-day0-delivery":
      email = generateStarterKitDay0DeliveryEmail({
        firstName,
        recipientEmail: candidate.email,
        accessUrl,
        presetDownloadUrl: process.env.STARTER_KIT_PRESET_DOWNLOAD_URL || undefined,
      })
      break
    case "starter-kit-day1-quick-win":
      email = generateStarterKitDay1QuickWinEmail({ firstName, accessUrl })
      break
    case "starter-kit-day3-story":
      email = generateStarterKitDay3StoryEmail({ firstName, accessUrl })
      break
    case "starter-kit-day5-proof":
      email = generateStarterKitDay5ProofEmail({ firstName, accessUrl })
      break
    case "starter-kit-day7-soft-masterclass":
      email = generateStarterKitDay7SoftMasterclassEmail({
        firstName,
        recipientEmail: candidate.email,
      })
      break
    case "starter-kit-day10-masterclass-breakdown":
      email = generateStarterKitDay10MasterclassBreakdownEmail({
        firstName,
        recipientEmail: candidate.email,
      })
      break
    case "starter-kit-day14-masterclass-offer":
      email = generateStarterKitDay14MasterclassOfferEmail({ firstName })
      break
    default:
      throw new Error(`Unknown starter kit email type: ${emailType}`)
  }

  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType,
    tags: ["starter-kit", emailType],
    marketing: emailType !== "starter-kit-day0-delivery",
  })
}

async function sendMasterclassTouchEmail(
  emailType: string,
  candidate: MasterclassCandidate,
  accessUrl: string
) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })

  let email: { html: string; text: string; subject: string }

  switch (emailType) {
    case "masterclass-day0-delivery":
      email = generateMasterclassDay0DeliveryEmail({
        firstName,
        courseUrl: `${SITE_URL}/academy/access/masterclass`,
        brandStrategyUrl: `${SITE_URL}/academy/access/brand-strategy`,
      })
      break
    case "masterclass-day2-checkin":
      email = generateMasterclassDay2CheckinEmail({ firstName, accessUrl })
      break
    case "masterclass-day5-deepen":
      email = generateMasterclassDay5DeepenEmail({ firstName, accessUrl })
      break
    case "masterclass-day7-soft-work-with-me":
      email = generateMasterclassDay7SoftWorkWithMeEmail({ firstName })
      break
    case "masterclass-day10-direct-invite":
      email = generateMasterclassDay10DirectInviteEmail({ firstName })
      break
    default:
      throw new Error(`Unknown masterclass email type: ${emailType}`)
  }

  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType,
    tags: ["masterclass", emailType],
    marketing: emailType !== "masterclass-day0-delivery",
  })
}

async function sendSelfieGuideActivationEmail(candidate: SelfieGuideActivationCandidate) {
  const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })
  const email = generateSelfieGuideActivationDay0Email({
    firstName,
    recipientEmail: candidate.email,
    accessUrl: selfieGuideAccessUrl(candidate),
  })

  return sendEmail({
    to: candidate.email,
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType: SELFIE_GUIDE_EMAIL_TOUCHES[0].emailType,
    tags: ["selfie-guide", "selfie-guide-activation"],
  })
}

export async function GET(request: Request) {
  const cronLogger = createCronLogger("nurture-sequence")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction =
      process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction) {
      if (!cronSecret) {
        await cronLogger.error(new Error("Unauthorized"), {
          reason: "CRON_SECRET not set in production",
        })
        return NextResponse.json(
          { error: "Unauthorized: CRON_SECRET required in production" },
          { status: 401 }
        )
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const results = {
      freebieGuideDay1: { found: 0, sent: 0, failed: 0 },
      freebieGuideDay3: { found: 0, sent: 0, failed: 0 },
      freebieGuideDay5: { found: 0, sent: 0, failed: 0 },
      freebieGuideDay8: { found: 0, sent: 0, failed: 0 },
      freebieGuideDay14: { found: 0, sent: 0, failed: 0 },
      aiPromptsDay1: { found: 0, sent: 0, failed: 0 },
      aiPromptsDay2: { found: 0, sent: 0, failed: 0 },
      aiPromptsDay5: { found: 0, sent: 0, failed: 0 },
      aiPromptsDay7: { found: 0, sent: 0, failed: 0 },
      aiPromptsDay9: { found: 0, sent: 0, failed: 0 },
      aiPromptsDay11: { found: 0, sent: 0, failed: 0 },
      aiPromptsDay14: { found: 0, sent: 0, failed: 0 },
      promptVaultDay2: { found: 0, sent: 0, failed: 0 },
      promptVaultDay3: { found: 0, sent: 0, failed: 0 },
      promptVaultDay5: { found: 0, sent: 0, failed: 0 },
      promptVaultDay10: { found: 0, sent: 0, failed: 0 },
      selfieToBrandShootDay1: { found: 0, sent: 0, failed: 0 },
      selfieToBrandShootDay3: { found: 0, sent: 0, failed: 0 },
      selfieToBrandShootDay5: { found: 0, sent: 0, failed: 0 },
      selfieToBrandShootDay7: { found: 0, sent: 0, failed: 0 },
      selfieGuideDay0: { found: 0, sent: 0, failed: 0 },
      selfieGuideDay3: { found: 0, sent: 0, failed: 0 },
      selfieGuideDay7: { found: 0, sent: 0, failed: 0 },
      selfieGuideDay14: { found: 0, sent: 0, failed: 0 },
      selfieGuideDay21: { found: 0, sent: 0, failed: 0 },
      starterKitDay0: { found: 0, sent: 0, failed: 0 },
      starterKitDay1: { found: 0, sent: 0, failed: 0 },
      starterKitDay3: { found: 0, sent: 0, failed: 0 },
      starterKitDay5: { found: 0, sent: 0, failed: 0 },
      starterKitDay7: { found: 0, sent: 0, failed: 0 },
      starterKitDay10: { found: 0, sent: 0, failed: 0 },
      starterKitDay14: { found: 0, sent: 0, failed: 0 },
      masterclassDay0: { found: 0, sent: 0, failed: 0 },
      masterclassDay2: { found: 0, sent: 0, failed: 0 },
      masterclassDay5: { found: 0, sent: 0, failed: 0 },
      masterclassDay7: { found: 0, sent: 0, failed: 0 },
      masterclassDay10: { found: 0, sent: 0, failed: 0 },
      errors: [] as Array<{ email: string; touch: string; error: string }>,
    }

    const freebieGuideTouchResultKeys = [
      "freebieGuideDay1",
      "freebieGuideDay5",
      "freebieGuideDay14",
    ] as const

    for (const [index, touch] of FREEBIE_GUIDE_EMAIL_TOUCHES.entries()) {
      const resultKey = freebieGuideTouchResultKeys[index]
      const candidates = await getFreebieGuideTouchCandidates(touch.days, touch.emailType)
      results[resultKey].found = candidates.length

      for (const candidate of candidates) {
        const accessUrl = selfieGuideAccessUrl(candidate)
        try {
          const result = await sendFreebieGuideTouchEmail(touch.emailType, candidate, accessUrl)
          if (result.success) {
            results[resultKey].sent += 1
          } else {
            results[resultKey].failed += 1
            results.errors.push({
              email: candidate.email,
              touch: touch.emailType,
              error: result.error || "unknown",
            })
          }
        } catch (error: unknown) {
          results[resultKey].failed += 1
          results.errors.push({
            email: candidate.email,
            touch: touch.emailType,
            error: errorMessage(error),
          })
        }

        await sleep(150)
      }
    }

    const legacyAiPromptsEnabled = process.env.LEGACY_NURTURE_AI_PROMPTS_ENABLED === "true"
    const aiPromptsEnabled =
      process.env.AI_PROMPTS_NURTURE_ENABLED === "true" && legacyAiPromptsEnabled
    const aiPromptsStartDate = aiPromptsNurtureStartDate()
    const aiPromptsTouchResultKeys = [
      "aiPromptsDay1",
      "aiPromptsDay5",
      "aiPromptsDay7",
      "aiPromptsDay9",
      "aiPromptsDay11",
      "aiPromptsDay14",
    ] as const

    if (aiPromptsEnabled) {
      for (const [index, touch] of AI_PROMPTS_EMAIL_TOUCHES.entries()) {
        const resultKey = aiPromptsTouchResultKeys[index]
        const candidates = await getAiPromptsTouchCandidates(
          touch.days,
          touch.emailType,
          aiPromptsStartDate,
          touch.suppressIfSentTypes
        )
        results[resultKey].found = candidates.length

        for (const candidate of candidates) {
          const accessUrl = aiPromptsAccessUrl(candidate)
          try {
            const result = await sendAiPromptsTouchEmail(touch.emailType, candidate, accessUrl)
            if (result.success) {
              results[resultKey].sent += 1
            } else {
              results[resultKey].failed += 1
              results.errors.push({
                email: candidate.email,
                touch: touch.emailType,
                error: result.error || "unknown",
              })
            }
          } catch (error: unknown) {
            results[resultKey].failed += 1
            results.errors.push({
              email: candidate.email,
              touch: touch.emailType,
              error: errorMessage(error),
            })
          }

          await sleep(150)
        }
      }
    }

    const legacyPromptVaultEnabled = process.env.LEGACY_NURTURE_PROMPT_VAULT_ENABLED === "true"
    const promptVaultNurtureEnabled =
      process.env.PROMPT_VAULT_NURTURE_ENABLED === "true" && legacyPromptVaultEnabled
    const promptVaultTouchResultKeys = [
      "promptVaultDay2",
      "promptVaultDay3",
      "promptVaultDay5",
      "promptVaultDay10",
    ] as const

    if (promptVaultNurtureEnabled) {
      for (const [index, touch] of PROMPT_VAULT_EMAIL_TOUCHES.entries()) {
        const resultKey = promptVaultTouchResultKeys[index]
        const candidates = await getPromptVaultTouchCandidates(touch.days, touch.emailType)
        results[resultKey].found = candidates.length

        for (const candidate of candidates) {
          const accessUrl = promptVaultAccessUrl(candidate)
          try {
            const result = await sendPromptVaultTouchEmail(touch.emailType, candidate, accessUrl)
            if (result.success) {
              results[resultKey].sent += 1
            } else {
              results[resultKey].failed += 1
              results.errors.push({
                email: candidate.email,
                touch: touch.emailType,
                error: result.error || "unknown",
              })
            }
          } catch (error: unknown) {
            results[resultKey].failed += 1
            results.errors.push({
              email: candidate.email,
              touch: touch.emailType,
              error: errorMessage(error),
            })
          }

          await sleep(150)
        }
      }
    }

    const selfieToBrandShootNurtureEnabled =
      process.env.SELFIE_TO_BRAND_SHOOT_NURTURE_ENABLED === "true"
    const selfieToBrandShootTouchResultKeys = [
      "selfieToBrandShootDay1",
      "selfieToBrandShootDay3",
      "selfieToBrandShootDay5",
      "selfieToBrandShootDay7",
    ] as const

    if (selfieToBrandShootNurtureEnabled) {
      for (const [index, touch] of SELFIE_TO_BRAND_SHOOT_EMAIL_TOUCHES.entries()) {
        const resultKey = selfieToBrandShootTouchResultKeys[index]
        const candidates = await getSelfieToBrandShootTouchCandidates(touch.days, touch.emailType)
        results[resultKey].found = candidates.length

        for (const candidate of candidates) {
          const accessUrl = selfieToBrandShootAccessUrl(candidate)
          try {
            const result = await sendSelfieToBrandShootTouchEmail(
              touch.emailType,
              candidate,
              accessUrl
            )
            if (result.success) {
              results[resultKey].sent += 1
              if (touch.emailType === "selfie-to-brand-shoot-day7-proof-request") {
                logAnalyticsEvent({
                  eventName: "selfie_to_brand_shoot_testimonial_requested",
                  path: "/api/cron/nurture-sequence",
                  properties: {
                    product_id: "selfie_to_brand_shoot_system",
                    email_type: touch.emailType,
                  },
                }).catch(() => {})
              }
            } else {
              results[resultKey].failed += 1
              results.errors.push({
                email: candidate.email,
                touch: touch.emailType,
                error: result.error || "unknown",
              })
            }
          } catch (error: unknown) {
            results[resultKey].failed += 1
            results.errors.push({
              email: candidate.email,
              touch: touch.emailType,
              error: errorMessage(error),
            })
          }

          await sleep(150)
        }
      }
    }

    // Day 0 activation
    const selfieGuideCandidates = await getSelfieGuideActivationCandidates()
    results.selfieGuideDay0.found = selfieGuideCandidates.length

    for (const candidate of selfieGuideCandidates) {
      try {
        const result = await sendSelfieGuideActivationEmail(candidate)
        if (result.success) {
          results.selfieGuideDay0.sent += 1
        } else {
          results.selfieGuideDay0.failed += 1
          results.errors.push({
            email: candidate.email,
            touch: "selfie-guide-day0",
            error: result.error || "unknown",
          })
        }
      } catch (error: unknown) {
        results.selfieGuideDay0.failed += 1
        results.errors.push({
          email: candidate.email,
          touch: "selfie-guide-day0",
          error: errorMessage(error),
        })
      }

      await sleep(150)
    }

    // Day 3, 7, 14, 21 timed touches — skip Day 0 (index 0) since it's handled above
    const selfieGuideTouchResultKeys = [
      "selfieGuideDay3",
      "selfieGuideDay7",
      "selfieGuideDay14",
      "selfieGuideDay21",
    ] as const
    const selfieGuideTouches = SELFIE_GUIDE_EMAIL_TOUCHES.slice(1) // skip Day 0

    for (const [index, touch] of selfieGuideTouches.entries()) {
      const resultKey = selfieGuideTouchResultKeys[index]
      const candidates = await getSelfieGuideTouchCandidates(touch.days, touch.emailType)
      results[resultKey].found = candidates.length

      for (const candidate of candidates) {
        const accessUrl = selfieGuideAccessUrl(candidate)
        try {
          const result = await sendSelfieGuideTouchEmail(touch.emailType, candidate, accessUrl)
          if (result.success) {
            results[resultKey].sent += 1
          } else {
            results[resultKey].failed += 1
            results.errors.push({
              email: candidate.email,
              touch: touch.emailType,
              error: result.error || "unknown",
            })
          }
        } catch (error: unknown) {
          results[resultKey].failed += 1
          results.errors.push({
            email: candidate.email,
            touch: touch.emailType,
            error: errorMessage(error),
          })
        }

        await sleep(150)
      }
    }

    const starterKitTouchResultKeys = [
      "starterKitDay0",
      "starterKitDay1",
      "starterKitDay3",
      "starterKitDay5",
      "starterKitDay7",
      "starterKitDay10",
      "starterKitDay14",
    ] as const

    for (const [index, touch] of STARTER_KIT_EMAIL_TOUCHES.entries()) {
      const resultKey = starterKitTouchResultKeys[index]
      const candidates = await getStarterKitCandidates(touch.days, touch.emailType)
      results[resultKey].found = candidates.length

      for (const candidate of candidates) {
        const accessUrl = starterKitAccessUrl(candidate)
        try {
          const result = await sendStarterKitTouchEmail(touch.emailType, candidate, accessUrl)
          if (result.success) {
            results[resultKey].sent += 1
          } else {
            results[resultKey].failed += 1
            results.errors.push({
              email: candidate.email,
              touch: touch.emailType,
              error: result.error || "unknown",
            })
          }
        } catch (error: unknown) {
          results[resultKey].failed += 1
          results.errors.push({
            email: candidate.email,
            touch: touch.emailType,
            error: errorMessage(error),
          })
        }

        await sleep(150)
      }
    }

    const masterclassTouchResultKeys = [
      "masterclassDay0",
      "masterclassDay2",
      "masterclassDay5",
      "masterclassDay7",
      "masterclassDay10",
    ] as const

    for (const [index, touch] of MASTERCLASS_EMAIL_TOUCHES.entries()) {
      const resultKey = masterclassTouchResultKeys[index]
      const candidates = await getMasterclassCandidates(touch.days, touch.emailType)
      results[resultKey].found = candidates.length

      for (const candidate of candidates) {
        const accessUrl = masterclassAccessUrl(candidate)
        try {
          const result = await sendMasterclassTouchEmail(touch.emailType, candidate, accessUrl)
          if (result.success) {
            results[resultKey].sent += 1
          } else {
            results[resultKey].failed += 1
            results.errors.push({
              email: candidate.email,
              touch: touch.emailType,
              error: result.error || "unknown",
            })
          }
        } catch (error: unknown) {
          results[resultKey].failed += 1
          results.errors.push({
            email: candidate.email,
            touch: touch.emailType,
            error: errorMessage(error),
          })
        }

        await sleep(150)
      }
    }

    const totalSent =
      results.freebieGuideDay1.sent +
      results.freebieGuideDay3.sent +
      results.freebieGuideDay5.sent +
      results.freebieGuideDay8.sent +
      results.freebieGuideDay14.sent +
      results.aiPromptsDay2.sent +
      results.aiPromptsDay5.sent +
      results.aiPromptsDay7.sent +
      results.promptVaultDay2.sent +
      results.promptVaultDay3.sent +
      results.promptVaultDay5.sent +
      results.promptVaultDay10.sent +
      results.selfieToBrandShootDay1.sent +
      results.selfieToBrandShootDay3.sent +
      results.selfieToBrandShootDay5.sent +
      results.selfieToBrandShootDay7.sent +
      results.selfieGuideDay0.sent +
      results.selfieGuideDay3.sent +
      results.selfieGuideDay7.sent +
      results.selfieGuideDay14.sent +
      results.selfieGuideDay21.sent +
      results.starterKitDay0.sent +
      results.starterKitDay1.sent +
      results.starterKitDay3.sent +
      results.starterKitDay5.sent +
      results.starterKitDay7.sent +
      results.starterKitDay10.sent +
      results.starterKitDay14.sent +
      results.masterclassDay0.sent +
      results.masterclassDay2.sent +
      results.masterclassDay5.sent +
      results.masterclassDay7.sent +
      results.masterclassDay10.sent
    const totalFailed =
      results.freebieGuideDay1.failed +
      results.freebieGuideDay3.failed +
      results.freebieGuideDay5.failed +
      results.freebieGuideDay8.failed +
      results.freebieGuideDay14.failed +
      results.aiPromptsDay2.failed +
      results.aiPromptsDay5.failed +
      results.aiPromptsDay7.failed +
      results.promptVaultDay2.failed +
      results.promptVaultDay3.failed +
      results.promptVaultDay5.failed +
      results.promptVaultDay10.failed +
      results.selfieToBrandShootDay1.failed +
      results.selfieToBrandShootDay3.failed +
      results.selfieToBrandShootDay5.failed +
      results.selfieToBrandShootDay7.failed +
      results.selfieGuideDay0.failed +
      results.selfieGuideDay3.failed +
      results.selfieGuideDay7.failed +
      results.selfieGuideDay14.failed +
      results.selfieGuideDay21.failed +
      results.starterKitDay0.failed +
      results.starterKitDay1.failed +
      results.starterKitDay3.failed +
      results.starterKitDay5.failed +
      results.starterKitDay7.failed +
      results.starterKitDay10.failed +
      results.starterKitDay14.failed +
      results.masterclassDay0.failed +
      results.masterclassDay2.failed +
      results.masterclassDay5.failed +
      results.masterclassDay7.failed +
      results.masterclassDay10.failed

    await cronLogger.success({
      freebieGuideDay1: results.freebieGuideDay1,
      freebieGuideDay3: results.freebieGuideDay3,
      freebieGuideDay5: results.freebieGuideDay5,
      freebieGuideDay8: results.freebieGuideDay8,
      freebieGuideDay14: results.freebieGuideDay14,
      aiPromptsEnabled,
      aiPromptsStartDate,
      aiPromptsDay2: results.aiPromptsDay2,
      aiPromptsDay5: results.aiPromptsDay5,
      aiPromptsDay7: results.aiPromptsDay7,
      promptVaultNurtureEnabled,
      promptVaultDay2: results.promptVaultDay2,
      promptVaultDay3: results.promptVaultDay3,
      promptVaultDay5: results.promptVaultDay5,
      promptVaultDay10: results.promptVaultDay10,
      selfieToBrandShootNurtureEnabled,
      selfieToBrandShootDay1: results.selfieToBrandShootDay1,
      selfieToBrandShootDay3: results.selfieToBrandShootDay3,
      selfieToBrandShootDay5: results.selfieToBrandShootDay5,
      selfieToBrandShootDay7: results.selfieToBrandShootDay7,
      selfieGuideDay0: results.selfieGuideDay0,
      selfieGuideDay3: results.selfieGuideDay3,
      selfieGuideDay7: results.selfieGuideDay7,
      selfieGuideDay14: results.selfieGuideDay14,
      selfieGuideDay21: results.selfieGuideDay21,
      starterKitDay0: results.starterKitDay0,
      starterKitDay1: results.starterKitDay1,
      starterKitDay3: results.starterKitDay3,
      starterKitDay5: results.starterKitDay5,
      starterKitDay7: results.starterKitDay7,
      starterKitDay10: results.starterKitDay10,
      starterKitDay14: results.starterKitDay14,
      masterclassDay0: results.masterclassDay0,
      masterclassDay2: results.masterclassDay2,
      masterclassDay5: results.masterclassDay5,
      masterclassDay7: results.masterclassDay7,
      masterclassDay10: results.masterclassDay10,
      totalSent,
      totalFailed,
    })

    return NextResponse.json({
      success: true,
      results,
      totalSent,
      totalFailed,
      errors: results.errors.slice(0, 20),
    })
  } catch (error: unknown) {
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:nurture-sequence",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})

    return NextResponse.json(
      {
        success: false,
        error: "Failed to run nurture sequence",
        details: errorMessage(error),
      },
      { status: 500 }
    )
  }
}
