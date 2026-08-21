import "server-only"

import type Stripe from "stripe"

import {
  projectAcademyProductRegistry,
  type AcademyRegistryProjectionRow,
} from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"
import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  createSuiteFounderPreflightReport,
  digestEvidence,
  normalizeSuiteFounderAcademyOwnership,
  type EvidenceSource,
  type SuiteFounderAuthEvidence,
  type SuiteFounderAutomaticEvidence,
  type SuiteFounderCoreEvidence,
  type SuiteFounderHumanEvidencePacket,
  type SuiteFounderPreflightReport,
  type SuiteFounderStripeEvidence,
} from "./suite-founder-preflight"
import {
  resolveSuiteProviderPilotConfig,
  type SuiteProviderPilotConfig,
} from "./suite-provider-pilot"

type Row = Record<string, unknown>
type Query = (query: string, params?: unknown[]) => Promise<Row[]>

export interface SuiteFounderPreflightDependencies {
  query: Query
  retrieveSubscription: (id: string) => Promise<Stripe.Subscription>
  retrieveInvoice: (id: string) => Promise<Stripe.Invoice>
  getAuthUserById: (id: string) => Promise<{
    id: string
    email?: string
    email_confirmed_at?: string | null
    confirmed_at?: string | null
    banned_until?: string | null
  } | null>
}

function rows(result: unknown): Row[] {
  return Array.isArray(result) ? (result as Row[]) : []
}

function runtimeDependencies(): SuiteFounderPreflightDependencies {
  return {
    query: async (query, params = []) => rows(await sql.query(query, params)),
    retrieveSubscription: id => stripe.subscriptions.retrieve(id, { expand: ["latest_invoice"] }),
    retrieveInvoice: id => stripe.invoices.retrieve(id),
    getAuthUserById: async id => {
      const admin = createAdminClient()
      const result = await admin.auth.admin.getUserById(id)
      if (result.error) throw result.error
      return result.data.user
    },
  }
}

function string(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function number(value: unknown): number {
  return Number(value)
}

function objectId(value: unknown): string | null {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && "id" in value) {
    return string((value as { id?: unknown }).id) || null
  }
  return null
}

function subscriptionPeriod(subscription: Stripe.Subscription): { start: number; end: number } {
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number
        current_period_end?: number
      })
    | undefined
  const legacy = subscription as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
  }
  return {
    start: Number(legacy.current_period_start ?? item?.current_period_start),
    end: Number(legacy.current_period_end ?? item?.current_period_end),
  }
}

async function source<T>(read: () => Promise<T>, reason: string): Promise<EvidenceSource<T>> {
  try {
    return { state: "available", value: await read() }
  } catch {
    return { state: "unavailable", reason }
  }
}

async function readCore(
  query: Query,
  config: Extract<SuiteProviderPilotConfig, { state: "ready" }>,
  env: Record<string, string | undefined>
): Promise<SuiteFounderCoreEvidence> {
  const founderEmail = String(env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase()
  if (!founderEmail) throw new Error("explicit ADMIN_EMAIL is required")
  const userId = config.userIds[0]
  const [users, founders, subscriptions, payments] = await Promise.all([
    query(`SELECT id, email, supabase_user_id, password_setup_complete FROM users WHERE id = $1`, [
      userId,
    ]),
    query(`SELECT id FROM users WHERE LOWER(email) = $1 ORDER BY id`, [founderEmail]),
    query(
      `
      SELECT stripe_subscription_id, stripe_customer_id, plan, status, is_test_mode,
        EXTRACT(EPOCH FROM current_period_start AT TIME ZONE 'UTC')::bigint AS period_start_epoch,
        EXTRACT(EPOCH FROM current_period_end AT TIME ZONE 'UTC')::bigint AS period_end_epoch
      FROM subscriptions
      WHERE user_id = $1 AND product_type = 'sselfie_studio_membership'
        AND stripe_subscription_id IS NOT NULL
      ORDER BY stripe_subscription_id
    `,
      [userId]
    ),
    query(
      `
      SELECT stripe_subscription_id, stripe_invoice_id, amount_cents, LOWER(currency) AS currency
      FROM stripe_payments
      WHERE user_id = $1 AND product_type = 'sselfie_studio_membership'
        AND payment_type = 'subscription' AND status IN ('paid', 'succeeded')
        AND COALESCE(is_test_mode, FALSE) = FALSE AND amount_cents > 0
        AND stripe_subscription_id IS NOT NULL AND stripe_invoice_id IS NOT NULL
        AND metadata->>'billing_reason' = 'subscription_create'
      ORDER BY stripe_subscription_id, stripe_invoice_id
    `,
      [userId]
    ),
  ])
  const user = users[0] ?? {}
  const subscription = subscriptions[0] ?? {}
  const payment = payments[0] ?? {}
  return {
    configuredUserCount: users.length,
    founderIdentityUserCount: founders.length,
    founderIdentityMatchesConfiguredUser:
      founders.length === 1 && string(founders[0].id) === userId,
    userId: string(user.id),
    userEmailDigest: digestEvidence(string(user.email).trim().toLowerCase()),
    authUserId: string(user.supabase_user_id) || null,
    passwordSetupComplete: user.password_setup_complete === true,
    subscriptionCount: subscriptions.length,
    subscriptionIdDigest: digestEvidence(string(subscription.stripe_subscription_id)),
    subscriptionIdPrivate: string(subscription.stripe_subscription_id),
    stripeCustomerIdPrivate: string(subscription.stripe_customer_id),
    planId: string(subscription.plan),
    status: string(subscription.status),
    isTestMode: subscription.is_test_mode === true,
    currentPeriodStartEpoch: number(subscription.period_start_epoch),
    currentPeriodEndEpoch: number(subscription.period_end_epoch),
    paymentCount: payments.length,
    paymentAmountCents: number(payment.amount_cents),
    paymentCurrency: string(payment.currency),
    paymentSubscriptionIdPrivate: string(payment.stripe_subscription_id),
    paymentInvoiceIdPrivate: string(payment.stripe_invoice_id),
  }
}

async function readStripe(
  core: SuiteFounderCoreEvidence,
  env: Record<string, string | undefined>,
  deps: SuiteFounderPreflightDependencies
): Promise<SuiteFounderStripeEvidence> {
  if (!core.subscriptionIdPrivate || !core.paymentInvoiceIdPrivate)
    throw new Error("missing exact Stripe IDs")
  const subscription = await deps.retrieveSubscription(core.subscriptionIdPrivate)
  const latestInvoiceId = objectId(subscription.latest_invoice)
  if (!latestInvoiceId) throw new Error("missing latest invoice")
  const expandedInvoice =
    typeof subscription.latest_invoice === "object" &&
    subscription.latest_invoice &&
    "status" in subscription.latest_invoice
      ? (subscription.latest_invoice as Stripe.Invoice)
      : null
  const invoice =
    expandedInvoice?.id === latestInvoiceId
      ? expandedInvoice
      : await deps.retrieveInvoice(latestInvoiceId)
  const period = subscriptionPeriod(subscription)
  const priceId = objectId(subscription.items?.data?.[0]?.price)
  const priceForPlan =
    core.planId === "annual"
      ? env.STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID
      : core.planId === "founding_annual"
        ? env.STRIPE_SSELFIE_STUDIO_FOUNDING_ANNUAL_PRICE_ID
        : core.planId === "monthly"
          ? env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID
          : undefined
  const metadataType = subscription.metadata?.product_type
  const invoiceAssociation = invoice as Stripe.Invoice & {
    parent?: { subscription_details?: { subscription?: unknown } } | null
    subscription?: unknown
  }
  const parentSubscriptionId =
    objectId(invoiceAssociation.parent?.subscription_details?.subscription) ||
    objectId(invoiceAssociation.subscription)
  return {
    subscriptionIdDigest: digestEvidence(subscription.id),
    livemode: subscription.livemode === true && invoice.livemode === true,
    status: subscription.status,
    customerMatches: objectId(subscription.customer) === core.stripeCustomerIdPrivate,
    priceConfigured: Boolean(priceId && priceForPlan && priceId === priceForPlan.trim()),
    metadataMatches:
      (metadataType === "sselfie_studio_membership" ||
        metadataType === "sselfie_studio_membership_annual") &&
      subscription.metadata?.plan === core.planId,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    cancelAt: subscription.cancel_at ?? null,
    canceledAt: subscription.canceled_at ?? null,
    endedAt: subscription.ended_at ?? null,
    pauseCollection: subscription.pause_collection !== null,
    currentPeriodStartEpoch: Number(period.start),
    currentPeriodEndEpoch: Number(period.end),
    latestInvoiceAssociationMatches: parentSubscriptionId === subscription.id,
    invoiceStatus: invoice.status || "",
    invoicePaidAt: invoice.status_transitions?.paid_at ?? 0,
    amountPaid: invoice.amount_paid,
    amountRemaining: invoice.amount_remaining,
    collectionMethod: invoice.collection_method,
  }
}

async function readAuth(
  core: SuiteFounderCoreEvidence,
  deps: SuiteFounderPreflightDependencies,
  observedAt: Date
): Promise<SuiteFounderAuthEvidence> {
  if (!core.authUserId) throw new Error("missing auth mapping")
  const auth = await deps.getAuthUserById(core.authUserId)
  const bannedUntil = auth?.banned_until ? Date.parse(auth.banned_until) : 0
  return {
    userExists: Boolean(auth),
    authIdMatches: auth?.id === core.authUserId,
    emailMatches: auth
      ? digestEvidence(
          String(auth.email || "")
            .trim()
            .toLowerCase()
        ) === core.userEmailDigest
      : false,
    confirmed: Boolean(auth?.email_confirmed_at || auth?.confirmed_at),
    banned: Number.isFinite(bannedUntil) && bannedUntil > observedAt.getTime(),
    passwordState: core.passwordSetupComplete ? "password_ready" : "recovery_required",
  }
}

async function readCountRow(query: Query, statement: string, ...params: unknown[]): Promise<Row> {
  const result = await query(statement, params)
  if (result.length !== 1) throw new Error("count query returned unexpected rows")
  return result[0]
}

async function collectEvidence(
  config: Extract<SuiteProviderPilotConfig, { state: "ready" }>,
  env: Record<string, string | undefined>,
  deps: SuiteFounderPreflightDependencies,
  observedAt: Date
): Promise<SuiteFounderAutomaticEvidence> {
  const core = await source(
    () => readCore(deps.query, config, env),
    "core database evidence unavailable"
  )
  const userId = config.userIds[0]
  const credits = await source(async () => {
    const row = await readCountRow(
      deps.query,
      `
      SELECT COUNT(uc.user_id)::int AS wallet_rows,
        COALESCE(SUM(uc.balance), 0)::int AS wallet_balance,
        COALESCE(SUM(uc.total_purchased), 0)::int AS total_purchased,
        COALESCE(SUM(uc.total_used), 0)::int AS total_used,
        (SELECT COUNT(*)::int FROM credit_transactions ct WHERE ct.user_id = $1) AS ledger_rows
      FROM user_credits uc WHERE uc.user_id = $1`,
      userId
    )
    return {
      walletRows: number(row.wallet_rows),
      walletBalance: number(row.wallet_balance),
      totalPurchased: number(row.total_purchased),
      totalUsed: number(row.total_used),
      ledgerRows: number(row.ledger_rows),
    }
  }, "credit baseline unavailable")
  const academyUserEntitlements = await source(async () => {
    const result = await deps.query(
      `SELECT product_id, metadata->>'purchased_product_id' AS purchased_product_id
       FROM user_entitlements
       WHERE user_id = $1 AND status = 'active' AND source <> 'membership'
         AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until > NOW())
       ORDER BY product_id`,
      [userId]
    )
    return {
      productIds: result
        .map(row =>
          normalizeSuiteFounderAcademyOwnership({
            source: "user_entitlement",
            productId: string(row.product_id),
            purchasedProductId: string(row.purchased_product_id) || null,
          })
        )
        .filter((id): id is string => id !== null),
    }
  }, "Academy user_entitlements unavailable")
  const academyCoursePurchases = await source(async () => {
    const result = await deps.query(
      `SELECT DISTINCT course_id AS product_id FROM academy_course_purchases
       WHERE user_id = $1 AND status = 'active' ORDER BY product_id`,
      [userId]
    )
    return {
      productIds: result
        .map(row =>
          normalizeSuiteFounderAcademyOwnership({
            source: "course_purchase",
            productId: string(row.product_id),
          })
        )
        .filter((id): id is string => id !== null),
    }
  }, "Academy course purchases unavailable")
  const academyLegacySubscriptions = await source(async () => {
    const result = await deps.query(
      `SELECT DISTINCT product_type AS product_id FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
         AND COALESCE(is_test_mode, FALSE) = FALSE
         AND product_type <> 'sselfie_studio_membership'
       ORDER BY product_id`,
      [userId]
    )
    return {
      productIds: result
        .map(row =>
          normalizeSuiteFounderAcademyOwnership({
            source: "legacy_subscription",
            productId: string(row.product_id),
          })
        )
        .filter((id): id is string => id !== null),
    }
  }, "Academy legacy subscriptions unavailable")
  const academyStripePayments = await source(async () => {
    const result = await deps.query(
      `SELECT DISTINCT product_type, metadata->>'product_id' AS metadata_product_id
       FROM stripe_payments
       WHERE user_id = $1 AND status = 'succeeded' AND COALESCE(is_test_mode, FALSE) = FALSE
       ORDER BY product_type, metadata_product_id`,
      [userId]
    )
    return {
      productIds: result
        .map(row =>
          normalizeSuiteFounderAcademyOwnership({
            source: "stripe_payment",
            productId: string(row.product_type),
            purchasedProductId: string(row.metadata_product_id) || null,
          })
        )
        .filter((id): id is string => id !== null),
    }
  }, "Academy Stripe ownership unavailable")
  const academyCatalog = await source(async () => {
    const result = await deps.query(
      `SELECT id, slug, title, type, membership_included, purchasable, stripe_price_id,
              active, sort_order, delivery_kind, access_target
       FROM academy_products
       WHERE active = TRUE
       ORDER BY sort_order ASC, id ASC`
    )
    const registry = projectAcademyProductRegistry(result as AcademyRegistryProjectionRow[])
    return {
      membershipProductIds: registry
        .filter(product => product.active && product.membershipIncluded)
        .map(product => product.id),
    }
  }, "Academy catalog unavailable")
  const maya = await source(async () => {
    const row = await readCountRow(
      deps.query,
      `
      SELECT
        (SELECT COUNT(*)::int FROM maya_chats WHERE user_id = $1) AS maya_chats,
        (SELECT COUNT(*)::int FROM maya_chat_messages m JOIN maya_chats c ON c.id = m.chat_id WHERE c.user_id = $1) AS maya_messages,
        (SELECT COUNT(*)::int FROM maya_personal_memory WHERE user_id = $1) AS maya_memories,
        (SELECT COUNT(*)::int FROM user_models WHERE user_id = $1 AND training_status = 'completed') AS maya_completed_models,
        (SELECT COUNT(*)::int FROM brand_assets WHERE user_id = $1) AS maya_brand_assets,
        (SELECT COUNT(*)::int FROM user_image_libraries WHERE user_id = $1) AS maya_uploads,
        (SELECT COUNT(*)::int FROM maya_produced_assets WHERE user_id = $1) AS maya_produced_assets,
        (SELECT COUNT(*)::int FROM user_personal_brand WHERE user_id = $1) AS maya_brand_profiles,
        (SELECT COUNT(*)::int FROM app_v3_maya_drafts WHERE user_id = $1 AND cleared_at IS NULL) AS maya_open_drafts`,
      userId
    )
    return {
      mayaChats: number(row.maya_chats),
      mayaMessages: number(row.maya_messages),
      mayaMemories: number(row.maya_memories),
      mayaCompletedModels: number(row.maya_completed_models),
      mayaBrandAssets: number(row.maya_brand_assets),
      mayaUploads: number(row.maya_uploads),
      mayaProducedAssets: number(row.maya_produced_assets),
      mayaBrandProfiles: number(row.maya_brand_profiles),
      mayaOpenDrafts: number(row.maya_open_drafts),
    }
  }, "Maya baseline unavailable")
  const integrations = await source(async () => {
    const row = await readCountRow(
      deps.query,
      `
      SELECT
        (SELECT COUNT(*)::int FROM external_accounts WHERE user_id = $1 AND provider = $2) AS external_accounts,
        (SELECT COUNT(*)::int FROM external_provisioning_states WHERE user_id = $1 AND provider = $2) AS provisioning_states,
        (SELECT COUNT(*)::int FROM integration_outbox WHERE captured_user_id = $1 AND provider = $2) AS outbox_rows`,
      userId,
      config.provider
    )
    return {
      externalAccounts: number(row.external_accounts),
      provisioningStates: number(row.provisioning_states),
      outboxRows: number(row.outbox_rows),
    }
  }, "integration baseline unavailable")
  const stripeEvidence =
    core.state === "available"
      ? await source(() => readStripe(core.value, env, deps), "Stripe evidence unavailable")
      : ({ state: "unavailable", reason: "core evidence unavailable" } as const)
  const auth =
    core.state === "available"
      ? await source(() => readAuth(core.value, deps, observedAt), "Auth evidence unavailable")
      : ({ state: "unavailable", reason: "core evidence unavailable" } as const)
  return {
    core,
    stripe: stripeEvidence,
    auth,
    credits,
    academyUserEntitlements,
    academyCoursePurchases,
    academyLegacySubscriptions,
    academyStripePayments,
    academyCatalog,
    maya,
    integrations,
  }
}

export async function createSuiteFounderPreflightFromCurrentSources(input: {
  env: Record<string, string | undefined>
  humanEvidence: SuiteFounderHumanEvidencePacket | unknown
  observedAt?: Date
  completedAt?: Date
  dependencies?: SuiteFounderPreflightDependencies
}): Promise<SuiteFounderPreflightReport> {
  const config = resolveSuiteProviderPilotConfig(input.env)
  const observedAt = input.observedAt ?? new Date()
  if (config.state !== "ready" || config.pilotMode !== "founder_only") {
    return createSuiteFounderPreflightReport({
      config,
      evidence: null,
      humanEvidence: input.humanEvidence,
      observedAt,
      completedAt: input.completedAt ?? observedAt,
    })
  }
  const evidence = await collectEvidence(
    config,
    input.env,
    input.dependencies ?? runtimeDependencies(),
    observedAt
  )
  // Completion is captured only after every current DB, Stripe, and Auth read has settled.
  const completedAt = input.completedAt ?? (input.observedAt ? observedAt : new Date())
  return createSuiteFounderPreflightReport({
    config,
    evidence,
    humanEvidence: input.humanEvidence,
    observedAt,
    completedAt,
  })
}
