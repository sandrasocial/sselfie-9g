import "server-only"

import { randomUUID } from "crypto"
import { sql } from "@/lib/db/client"

export const PRESETS_SINGLE_PRODUCT_TYPE = "presets_single"
export const PRESETS_BUNDLE_PRODUCT_TYPE = "presets_bundle"

export type PresetsProductType =
  | typeof PRESETS_SINGLE_PRODUCT_TYPE
  | typeof PRESETS_BUNDLE_PRODUCT_TYPE

export type PresetsTier = "single" | "bundle"

export type PresetOrder = {
  id: number
  email: string
  name: string | null
  accessToken: string
  tier: PresetsTier
  collectionSlug: string | null
  stripeSessionId: string | null
  stripePaymentId: string | null
  stripeCustomerId: string | null
  status: string
}

let schemaReady: Promise<void> | null = null

export function isPresetsProductType(value?: string | null): value is PresetsProductType {
  return value === PRESETS_SINGLE_PRODUCT_TYPE || value === PRESETS_BUNDLE_PRODUCT_TYPE
}

export function tierForPresetsProductType(productType: PresetsProductType): PresetsTier {
  return productType === PRESETS_BUNDLE_PRODUCT_TYPE ? "bundle" : "single"
}

export function presetsProductIdForTier(tier: PresetsTier) {
  return tier === "bundle" ? PRESETS_BUNDLE_PRODUCT_TYPE : PRESETS_SINGLE_PRODUCT_TYPE
}

export function presetsSourceForTier(tier: PresetsTier) {
  return tier === "bundle" ? "presets-bundle-paid" : "presets-single-paid"
}

export async function ensurePresetOrdersSchema(): Promise<void> {
  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS preset_orders (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        access_token TEXT NOT NULL UNIQUE,
        tier TEXT NOT NULL CHECK (tier IN ('single', 'bundle')),
        collection_slug TEXT,
        stripe_session_id TEXT UNIQUE,
        stripe_payment_id TEXT,
        stripe_customer_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        source TEXT NOT NULL DEFAULT 'presets-paid',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_preset_orders_token ON preset_orders (access_token)`
    await sql`CREATE INDEX IF NOT EXISTS idx_preset_orders_email ON preset_orders (LOWER(email), status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_preset_orders_session ON preset_orders (stripe_session_id)`
  })()

  await schemaReady
}

function mapPresetOrder(row: any): PresetOrder {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: (row.name as string | null) || null,
    accessToken: String(row.access_token),
    tier: row.tier === "bundle" ? "bundle" : "single",
    collectionSlug: (row.collection_slug as string | null) || null,
    stripeSessionId: (row.stripe_session_id as string | null) || null,
    stripePaymentId: (row.stripe_payment_id as string | null) || null,
    stripeCustomerId: (row.stripe_customer_id as string | null) || null,
    status: String(row.status || "active"),
  }
}

export async function upsertPresetOrderForPurchase(input: {
  email: string
  name?: string | null
  tier: PresetsTier
  collectionSlug?: string | null
  stripeSessionId: string
  stripePaymentId?: string | null
  stripeCustomerId?: string | null
  metadata?: Record<string, unknown> | null
}): Promise<PresetOrder> {
  await ensurePresetOrdersSchema()

  const resolvedName = (input.name || input.email.split("@")[0] || "Presets buyer").trim()
  const collectionSlug = input.tier === "single" ? input.collectionSlug?.trim() || null : null
  const metadata = JSON.stringify(input.metadata || {})
  const source = presetsSourceForTier(input.tier)

  const existing = await sql`
    SELECT access_token
    FROM preset_orders
    WHERE stripe_session_id = ${input.stripeSessionId}
    LIMIT 1
  `
  const accessToken = (existing[0]?.access_token as string | undefined)?.trim() || randomUUID()

  const rows = await sql`
    INSERT INTO preset_orders (
      email,
      name,
      access_token,
      tier,
      collection_slug,
      stripe_session_id,
      stripe_payment_id,
      stripe_customer_id,
      status,
      source,
      metadata,
      created_at,
      updated_at
    )
    VALUES (
      ${input.email.toLowerCase()},
      ${resolvedName},
      ${accessToken},
      ${input.tier},
      ${collectionSlug},
      ${input.stripeSessionId},
      ${input.stripePaymentId || null},
      ${input.stripeCustomerId || null},
      'active',
      ${source},
      ${metadata}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (stripe_session_id)
    DO UPDATE SET
      email = EXCLUDED.email,
      name = COALESCE(NULLIF(EXCLUDED.name, ''), preset_orders.name),
      tier = EXCLUDED.tier,
      collection_slug = EXCLUDED.collection_slug,
      stripe_payment_id = COALESCE(EXCLUDED.stripe_payment_id, preset_orders.stripe_payment_id),
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, preset_orders.stripe_customer_id),
      status = 'active',
      source = EXCLUDED.source,
      metadata = preset_orders.metadata || EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING
      id,
      email,
      name,
      access_token,
      tier,
      collection_slug,
      stripe_session_id,
      stripe_payment_id,
      stripe_customer_id,
      status
  `

  return mapPresetOrder(rows[0])
}

export async function getPresetOrderByToken(token: string): Promise<PresetOrder | null> {
  const cleanToken = token.trim()
  if (!cleanToken) return null

  await ensurePresetOrdersSchema()
  const rows = await sql`
    SELECT
      id,
      email,
      name,
      access_token,
      tier,
      collection_slug,
      stripe_session_id,
      stripe_payment_id,
      stripe_customer_id,
      status
    FROM preset_orders
    WHERE access_token = ${cleanToken}
      AND status = 'active'
    LIMIT 1
  `

  return rows[0] ? mapPresetOrder(rows[0]) : null
}
