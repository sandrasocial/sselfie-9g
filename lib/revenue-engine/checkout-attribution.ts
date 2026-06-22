import { getDb } from "@/lib/db/client"
import { getProductById, type PricingProduct } from "@/lib/products"

export type CheckoutOrigin = "guest" | "authenticated"
export type CheckoutAttributionStatus = "started" | "completed" | "abandoned"
export type RevenueFunnelStage =
  | "entry_offer"
  | "primary_upsell"
  | "studio_membership"
  | "retention"
  | "expansion"

export type BuyerStage = "lead" | "micro" | "suite" | "studio" | "private"

export type CheckoutAttributionInput = {
  offerSlug?: string | null
  source?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  emailType?: string | null
  campaignId?: number | string | null
  referralCode?: string | null
  guideCta?: string | null
  freebieSource?: string | null
  checkoutSource?: string | null
  ctaKeyword?: string | null
  promptNumber?: string | null
  quizResult?: string | null
  returnTo?: string | null
  entryPath?: string | null
  entryPostSlug?: string | null
  buyerStage?: string | null
}

export type NormalizedCheckoutAttribution = {
  offerSlug: string
  source: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  emailType: string | null
  campaignId: number | null
  referralCode: string | null
  guideCta: string | null
  freebieSource: string | null
  checkoutSource: string | null
  ctaKeyword: string | null
  promptNumber: string | null
  quizResult: string | null
  returnTo: string | null
  entryPath: string | null
  entryPostSlug: string | null
  buyerStage: BuyerStage
  funnelStage: RevenueFunnelStage
}

export type CheckoutAttributionRecord = {
  sessionId: string
  checkoutOrigin: CheckoutOrigin
  status?: CheckoutAttributionStatus
  productId: string
  productType: PricingProduct["type"] | string
  offerSlug: string
  funnelStage: RevenueFunnelStage
  source: string
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  emailType?: string | null
  campaignId?: number | null
  referralCode?: string | null
  guideCta?: string | null
  freebieSource?: string | null
  checkoutSource?: string | null
  ctaKeyword?: string | null
  promptNumber?: string | null
  quizResult?: string | null
  returnTo?: string | null
  entryPath?: string | null
  entryPostSlug?: string | null
  buyerStage?: BuyerStage | string | null
  userId?: string | null
  userEmail?: string | null
  stripeCustomerId?: string | null
}

export type CompletedCheckoutAttribution = {
  sessionId?: string | null
  stripeSubscriptionId?: string | null
  userId?: string | null
  userEmail?: string | null
  stripeCustomerId?: string | null
  stripePaymentId?: string | null
  stripeInvoiceId?: string | null
  status?: CheckoutAttributionStatus
  purchaseValueCents?: number | null
  purchaseCurrency?: string | null
  purchasedAt?: Date | string | null
}

export type CheckoutAttributionContactUpdate = {
  sessionId: string
  userEmail?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
}

let ensured = false

function safeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed
}

function safeCampaignId(value: unknown): number | null {
  const candidate =
    typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN
  return Number.isFinite(candidate) && candidate > 0 ? candidate : null
}

function getDefaultOfferSlug(productId: string, productType?: PricingProduct["type"] | string): string {
  const value = safeString(productType || productId, 80) || productId
  return value.replace(/_/g, "-")
}

function normalizeBuyerStage(value: unknown, productType?: PricingProduct["type"] | string): BuyerStage {
  const raw = safeString(value, 40)?.toLowerCase()
  if (raw === "lead" || raw === "micro" || raw === "suite" || raw === "studio" || raw === "private") {
    return raw
  }

  if (productType === "visibility_suite") return "suite"
  if (productType === "sselfie_studio_membership" || productType === "sselfie_studio_membership_annual") return "studio"
  return "micro"
}

export function getRevenueFunnelStage(productType?: PricingProduct["type"] | string): RevenueFunnelStage {
  switch (productType) {
    case "brand_strategy_pack":
      return "primary_upsell"
    case "sselfie_studio_membership":
    case "sselfie_studio_membership_annual":
      return "studio_membership"
    case "credit_topup":
      return "expansion"
    default:
      return "entry_offer"
  }
}

export function normalizeCheckoutAttribution(
  productId: string,
  input?: CheckoutAttributionInput | null,
): NormalizedCheckoutAttribution {
  const product = getProductById(productId)
  const productType = product?.type || productId

  return {
    offerSlug: safeString(input?.offerSlug, 80) || getDefaultOfferSlug(productId, productType),
    source: safeString(input?.source, 120) || "direct_checkout",
    utmSource: safeString(input?.utmSource, 120),
    utmMedium: safeString(input?.utmMedium, 120),
    utmCampaign: safeString(input?.utmCampaign, 160),
    utmContent: safeString(input?.utmContent, 160),
    emailType: safeString(input?.emailType, 120),
    campaignId: safeCampaignId(input?.campaignId),
    referralCode: safeString(input?.referralCode, 64)?.toUpperCase() || null,
    guideCta: safeString(input?.guideCta, 80),
    freebieSource: safeString(input?.freebieSource, 120),
    checkoutSource: safeString(input?.checkoutSource, 120),
    ctaKeyword: safeString(input?.ctaKeyword, 40)?.toUpperCase() || null,
    promptNumber: safeString(input?.promptNumber, 40),
    quizResult: safeString(input?.quizResult, 80),
    returnTo: safeString(input?.returnTo, 500),
    entryPath: safeString(input?.entryPath, 500),
    entryPostSlug: safeString(input?.entryPostSlug, 160),
    buyerStage: normalizeBuyerStage(input?.buyerStage, productType),
    funnelStage: getRevenueFunnelStage(productType),
  }
}

export function getCheckoutAttributionFromParams(
  params: Record<string, string | undefined | null>,
  defaults?: CheckoutAttributionInput,
): CheckoutAttributionInput {
  return {
    offerSlug: params.offer_slug || defaults?.offerSlug || null,
    source: params.source || defaults?.source || null,
    utmSource: params.utm_source || defaults?.utmSource || null,
    utmMedium: params.utm_medium || defaults?.utmMedium || null,
    utmCampaign: params.utm_campaign || defaults?.utmCampaign || null,
    utmContent: params.utm_content || defaults?.utmContent || null,
    emailType: params.email_type || defaults?.emailType || null,
    campaignId: params.campaign_id || defaults?.campaignId || null,
    referralCode: params.ref || params.referral_code || defaults?.referralCode || null,
    guideCta: params.guide_cta || defaults?.guideCta || null,
    freebieSource: params.freebie_source || defaults?.freebieSource || null,
    checkoutSource: params.checkout_source || defaults?.checkoutSource || null,
    ctaKeyword: params.cta_keyword || defaults?.ctaKeyword || null,
    promptNumber: params.prompt_n || params.prompt_number || defaults?.promptNumber || null,
    quizResult: params.quiz_result || defaults?.quizResult || null,
    returnTo: params.returnTo || params.return_to || defaults?.returnTo || null,
    entryPath: params.entry_path || defaults?.entryPath || null,
    entryPostSlug: params.entry_post_slug || defaults?.entryPostSlug || null,
    buyerStage: params.buyer_stage || defaults?.buyerStage || null,
  }
}

const CHECKOUT_REDIRECT_ATTRIBUTION_PARAMS = [
  "source",
  "plan",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "email_type",
  "campaign_id",
  "ref",
  "referral_code",
  "checkout_source",
  "freebie_source",
  "guide_cta",
  "cta_keyword",
  "prompt_n",
  "quiz_result",
  "return_to",
  "entry_path",
  "entry_post_slug",
  "buyer_stage",
  "vault_credit",
  "upgrade_credit",
  "tier",
  "collection",
] as const

export function buildCheckoutRedirectUrl(
  clientSecret: string,
  productType: string,
  params: Record<string, string | undefined | null>,
): string {
  const search = new URLSearchParams({
    client_secret: clientSecret,
    product_type: productType,
  })

  for (const key of CHECKOUT_REDIRECT_ATTRIBUTION_PARAMS) {
    const value = safeString(params[key], 500)
    if (value) {
      search.set(key, value)
    }
  }

  return `/checkout?${search.toString()}`
}

export function buildCheckoutAttributionMetadata(
  productId: string,
  input?: CheckoutAttributionInput | null,
): Record<string, string> {
  const normalized = normalizeCheckoutAttribution(productId, input)

  return {
    offer_slug: normalized.offerSlug,
    source: normalized.source,
    funnel_stage: normalized.funnelStage,
    ...(normalized.utmSource ? { utm_source: normalized.utmSource } : {}),
    ...(normalized.utmMedium ? { utm_medium: normalized.utmMedium } : {}),
    ...(normalized.utmCampaign ? { utm_campaign: normalized.utmCampaign } : {}),
    ...(normalized.utmContent ? { utm_content: normalized.utmContent } : {}),
    ...(normalized.emailType ? { email_type: normalized.emailType } : {}),
    ...(normalized.campaignId ? { campaign_id: String(normalized.campaignId) } : {}),
    ...(normalized.referralCode ? { referral_code: normalized.referralCode, ref: normalized.referralCode } : {}),
    ...(normalized.guideCta ? { guide_cta: normalized.guideCta } : {}),
    ...(normalized.freebieSource ? { freebie_source: normalized.freebieSource } : {}),
    ...(normalized.checkoutSource ? { checkout_source: normalized.checkoutSource } : {}),
    ...(normalized.ctaKeyword ? { cta_keyword: normalized.ctaKeyword } : {}),
    ...(normalized.promptNumber ? { prompt_n: normalized.promptNumber, prompt_number: normalized.promptNumber } : {}),
    ...(normalized.quizResult ? { quiz_result: normalized.quizResult } : {}),
    ...(normalized.returnTo ? { return_to: normalized.returnTo } : {}),
    ...(normalized.entryPath ? { entry_path: normalized.entryPath } : {}),
    ...(normalized.entryPostSlug ? { entry_post_slug: normalized.entryPostSlug } : {}),
    buyer_stage: normalized.buyerStage,
  }
}

export async function ensureRevenueEngineSchema(): Promise<void> {
  if (ensured) return
  ensured = true

  const sql = getDb()

  await sql`
    CREATE TABLE IF NOT EXISTS checkout_attribution (
      session_id TEXT PRIMARY KEY,
      checkout_origin TEXT NOT NULL CHECK (checkout_origin IN ('guest', 'authenticated')),
      status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'abandoned')),
      product_id TEXT NOT NULL,
      product_type TEXT NOT NULL,
      offer_slug TEXT NOT NULL,
      funnel_stage TEXT NOT NULL,
      source TEXT NOT NULL,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      email_type TEXT,
      campaign_id INTEGER,
      referral_code TEXT,
      guide_cta TEXT,
      freebie_source TEXT,
      checkout_source TEXT,
      cta_keyword TEXT,
      prompt_number TEXT,
      quiz_result TEXT,
      return_to TEXT,
      entry_path TEXT,
      entry_post_slug TEXT,
      buyer_stage TEXT,
      user_id TEXT,
      user_email TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      stripe_payment_id TEXT,
      stripe_invoice_id TEXT,
      purchase_value_cents INTEGER,
      purchase_currency TEXT,
      purchased_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_offer_idx ON checkout_attribution (offer_slug, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_stage_idx ON checkout_attribution (funnel_stage, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_status_idx ON checkout_attribution (status, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_campaign_idx ON checkout_attribution (campaign_id, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_referral_idx ON checkout_attribution (referral_code, created_at DESC);`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS email_type TEXT;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS guide_cta TEXT;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS freebie_source TEXT;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS checkout_source TEXT;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS cta_keyword TEXT;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS prompt_number TEXT;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS quiz_result TEXT;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS entry_post_slug TEXT;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS buyer_stage TEXT;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS recovery_email_sent_at TIMESTAMPTZ;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS recovery_email_type TEXT;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS recovery_email_message_id TEXT;`
  await sql`ALTER TABLE checkout_attribution ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMPTZ;`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_cta_keyword_idx ON checkout_attribution (cta_keyword, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_prompt_number_idx ON checkout_attribution (prompt_number, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_quiz_result_idx ON checkout_attribution (quiz_result, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_entry_post_slug_idx ON checkout_attribution (entry_post_slug, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_buyer_stage_idx ON checkout_attribution (buyer_stage, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_recovery_idx ON checkout_attribution (product_type, status, recovery_email_sent_at, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_purchase_idx ON checkout_attribution (purchased_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS checkout_attribution_user_idx ON checkout_attribution (user_id, created_at DESC);`

  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS customer_email TEXT;`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS source TEXT;`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_source TEXT;`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_medium TEXT;`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_campaign TEXT;`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_content TEXT;`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS checkout_source TEXT;`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS cta_keyword TEXT;`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS prompt_number TEXT;`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS entry_post_slug TEXT;`
  await sql`ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS buyer_stage TEXT;`
  await sql`CREATE INDEX IF NOT EXISTS stripe_payments_customer_email_idx ON stripe_payments (LOWER(customer_email), payment_date DESC);`
  await sql`CREATE INDEX IF NOT EXISTS stripe_payments_checkout_session_idx ON stripe_payments (checkout_session_id);`
}

export async function upsertCheckoutAttribution(record: CheckoutAttributionRecord): Promise<void> {
  await ensureRevenueEngineSchema()

  const sql = getDb()

  await sql`
    INSERT INTO checkout_attribution (
      session_id,
      checkout_origin,
      status,
      product_id,
      product_type,
      offer_slug,
      funnel_stage,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      email_type,
      campaign_id,
      referral_code,
      guide_cta,
      freebie_source,
      checkout_source,
      cta_keyword,
      prompt_number,
      quiz_result,
      return_to,
      entry_path,
      entry_post_slug,
      buyer_stage,
      user_id,
      user_email,
      stripe_customer_id
    ) VALUES (
      ${record.sessionId},
      ${record.checkoutOrigin},
      ${record.status || "started"},
      ${record.productId},
      ${record.productType},
      ${record.offerSlug},
      ${record.funnelStage},
      ${record.source},
      ${record.utmSource || null},
      ${record.utmMedium || null},
      ${record.utmCampaign || null},
      ${record.utmContent || null},
      ${record.emailType || null},
      ${record.campaignId || null},
      ${record.referralCode || null},
      ${record.guideCta || null},
      ${record.freebieSource || null},
      ${record.checkoutSource || null},
      ${record.ctaKeyword || null},
      ${record.promptNumber || null},
      ${record.quizResult || null},
      ${record.returnTo || null},
      ${record.entryPath || null},
      ${record.entryPostSlug || null},
      ${record.buyerStage || null},
      ${record.userId || null},
      ${record.userEmail || null},
      ${record.stripeCustomerId || null}
    )
    ON CONFLICT (session_id)
    DO UPDATE SET
      checkout_origin = EXCLUDED.checkout_origin,
      status = EXCLUDED.status,
      product_id = EXCLUDED.product_id,
      product_type = EXCLUDED.product_type,
      offer_slug = EXCLUDED.offer_slug,
      funnel_stage = EXCLUDED.funnel_stage,
      source = EXCLUDED.source,
      utm_source = COALESCE(EXCLUDED.utm_source, checkout_attribution.utm_source),
      utm_medium = COALESCE(EXCLUDED.utm_medium, checkout_attribution.utm_medium),
      utm_campaign = COALESCE(EXCLUDED.utm_campaign, checkout_attribution.utm_campaign),
      utm_content = COALESCE(EXCLUDED.utm_content, checkout_attribution.utm_content),
      email_type = COALESCE(EXCLUDED.email_type, checkout_attribution.email_type),
      campaign_id = COALESCE(EXCLUDED.campaign_id, checkout_attribution.campaign_id),
      referral_code = COALESCE(EXCLUDED.referral_code, checkout_attribution.referral_code),
      guide_cta = COALESCE(EXCLUDED.guide_cta, checkout_attribution.guide_cta),
      freebie_source = COALESCE(EXCLUDED.freebie_source, checkout_attribution.freebie_source),
      checkout_source = COALESCE(EXCLUDED.checkout_source, checkout_attribution.checkout_source),
      cta_keyword = COALESCE(EXCLUDED.cta_keyword, checkout_attribution.cta_keyword),
      prompt_number = COALESCE(EXCLUDED.prompt_number, checkout_attribution.prompt_number),
      quiz_result = COALESCE(EXCLUDED.quiz_result, checkout_attribution.quiz_result),
      return_to = COALESCE(EXCLUDED.return_to, checkout_attribution.return_to),
      entry_path = COALESCE(EXCLUDED.entry_path, checkout_attribution.entry_path),
      entry_post_slug = COALESCE(EXCLUDED.entry_post_slug, checkout_attribution.entry_post_slug),
      buyer_stage = COALESCE(EXCLUDED.buyer_stage, checkout_attribution.buyer_stage),
      user_id = COALESCE(EXCLUDED.user_id, checkout_attribution.user_id),
      user_email = COALESCE(EXCLUDED.user_email, checkout_attribution.user_email),
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, checkout_attribution.stripe_customer_id),
      updated_at = NOW()
  `
}

export async function markCheckoutAttributionCompleted(update: CompletedCheckoutAttribution): Promise<void> {
  await ensureRevenueEngineSchema()

  const sql = getDb()
  const purchasedAt = update.purchasedAt ? new Date(update.purchasedAt) : new Date()
  const status = update.status || "completed"

  if (update.sessionId) {
    await sql`
      UPDATE checkout_attribution
      SET
        status = ${status},
        user_id = COALESCE(${update.userId || null}, user_id),
        user_email = COALESCE(${update.userEmail || null}, user_email),
        stripe_customer_id = COALESCE(${update.stripeCustomerId || null}, stripe_customer_id),
        stripe_subscription_id = COALESCE(${update.stripeSubscriptionId || null}, stripe_subscription_id),
        stripe_payment_id = COALESCE(${update.stripePaymentId || null}, stripe_payment_id),
        stripe_invoice_id = COALESCE(${update.stripeInvoiceId || null}, stripe_invoice_id),
        purchase_value_cents = COALESCE(${update.purchaseValueCents || null}, purchase_value_cents),
        purchase_currency = COALESCE(${safeString(update.purchaseCurrency || null, 16) || null}, purchase_currency),
        purchased_at = COALESCE(${purchasedAt.toISOString()}, purchased_at),
        recovered_at = CASE
          WHEN recovery_email_sent_at IS NOT NULL THEN COALESCE(recovered_at, ${purchasedAt.toISOString()})
          ELSE recovered_at
        END,
        updated_at = NOW()
      WHERE session_id = ${update.sessionId}
    `
    return
  }

  if (update.stripeSubscriptionId) {
    await sql`
      UPDATE checkout_attribution
      SET
        status = ${status},
        user_id = COALESCE(${update.userId || null}, user_id),
        user_email = COALESCE(${update.userEmail || null}, user_email),
        stripe_customer_id = COALESCE(${update.stripeCustomerId || null}, stripe_customer_id),
        stripe_subscription_id = COALESCE(${update.stripeSubscriptionId}, stripe_subscription_id),
        stripe_payment_id = COALESCE(${update.stripePaymentId || null}, stripe_payment_id),
        stripe_invoice_id = COALESCE(${update.stripeInvoiceId || null}, stripe_invoice_id),
        purchase_value_cents = COALESCE(${update.purchaseValueCents || null}, purchase_value_cents),
        purchase_currency = COALESCE(${safeString(update.purchaseCurrency || null, 16) || null}, purchase_currency),
        purchased_at = COALESCE(${purchasedAt.toISOString()}, purchased_at),
        recovered_at = CASE
          WHEN recovery_email_sent_at IS NOT NULL THEN COALESCE(recovered_at, ${purchasedAt.toISOString()})
          ELSE recovered_at
        END,
        updated_at = NOW()
      WHERE stripe_subscription_id = ${update.stripeSubscriptionId}
         OR (stripe_subscription_id IS NULL AND user_id = ${update.userId || ""} AND funnel_stage = 'studio_membership')
    `
  }
}

export async function persistCheckoutAttributionContact(
  update: CheckoutAttributionContactUpdate,
): Promise<void> {
  const userEmail = safeString(update.userEmail, 320)
  if (!update.sessionId || !userEmail) return

  await ensureRevenueEngineSchema()

  const sql = getDb()

  await sql`
    UPDATE checkout_attribution
    SET
      user_email = COALESCE(user_email, ${userEmail}),
      stripe_customer_id = COALESCE(stripe_customer_id, ${update.stripeCustomerId || null}),
      stripe_subscription_id = COALESCE(stripe_subscription_id, ${update.stripeSubscriptionId || null}),
      updated_at = NOW()
    WHERE session_id = ${update.sessionId}
  `
}
