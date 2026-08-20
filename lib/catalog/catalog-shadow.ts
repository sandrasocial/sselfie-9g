/**
 * Release 1B: read-only product catalogue projection.
 *
 * This module deliberately has no imports from runtime checkout, entitlement, Stripe, email,
 * analytics, or database code. Callers inject observations from current sources and receive a
 * deterministic comparison report. Nothing here is authoritative for customer-facing behavior.
 */

export const CATALOG_SHADOW_FINDING_CODES = [
  "LIFECYCLE_CONFLICT",
  "DB_DISABLED_BUT_EFFECTIVE_ACTIVE",
  "DB_NONPURCHASABLE_BUT_EFFECTIVE_PURCHASABLE",
  "DB_PRICE_SHADOWED_BY_CODE",
  "PRICE_REFERENCE_CONFLICT",
  "MISSING_PRICE_CONFIGURATION",
  "DUPLICATE_STRIPE_PRICE_REFERENCE",
  "AMOUNT_CONFLICT",
  "CURRENCY_CONFLICT",
  "CURRENCY_UNKNOWN",
  "PUBLIC_PRICE_LITERAL",
  "CODE_ONLY_PRODUCT",
  "DB_ONLY_PRODUCT",
  "MISSING_REVENUE_PATH",
  "MISSING_FULFILLMENT_CONTRACT",
  "REPORT_FAILURE",
] as const

export type CatalogShadowFindingCode = (typeof CATALOG_SHADOW_FINDING_CODES)[number]
export type CatalogShadowSeverity = "blocker" | "warning" | "info"
export type CatalogShadowCurrency = "usd" | "eur"
export type CatalogShadowBillingInterval = "one_time" | "month" | "year"
export type CatalogShadowLifecycle = "live" | "archived" | "legacy_access_only" | "private"
export type CatalogShadowPriceMode = "stripe_price" | "inline" | "none"
export type CatalogShadowAliasKind =
  | "product_id"
  | "product_type"
  | "plan"
  | "entitlement_id"
  | "package_id"

export interface CatalogShadowProvenance {
  source: "code" | "database" | "environment" | "public_copy" | "runtime_projection"
  location: string
  detail?: string
  observation?: "academy_db" | "academy_override" | "academy_effective"
}

export interface CatalogShadowAlias {
  kind: CatalogShadowAliasKind
  value: string
  provenance: CatalogShadowProvenance
}

export interface CatalogShadowPriceReference {
  envKey: string
  priceId: string | null
  status: "configured_unverified" | "missing"
  selectedAtObservation?: boolean
  scenario?: string
  condition?: string
  effectiveFrom?: string | null
  effectiveUntil?: string | null
  provenance: CatalogShadowProvenance
}

export interface CatalogShadowAccessExpansion {
  productId: string
  condition?: string
  provenance: CatalogShadowProvenance
}

export interface CatalogShadowNonEntitlementGrant {
  kind: "preset_order" | "temporary_subscription_pass"
  id: string
  provenance: CatalogShadowProvenance
}

export interface CatalogShadowProductVariant {
  id: string
  amountCents: number
  currency: CatalogShadowCurrency
  credits: number
  priceMode: "inline"
  saleAudience: "existing_members"
  provenance: CatalogShadowProvenance
}

export interface CatalogShadowCodeProductSnapshot {
  id: string
  name?: string | null
  lifecycleStatus?: CatalogShadowLifecycle | null
  effectiveActive?: boolean | null
  effectivePurchasable?: boolean | null
  privatePilot?: boolean
  amountCents?: number | null
  currency?: CatalogShadowCurrency | null
  billingInterval?: CatalogShadowBillingInterval | null
  priceMode?: CatalogShadowPriceMode
  priceReferences?: readonly CatalogShadowPriceReference[]
  entitlementGrants?: readonly CatalogShadowAccessExpansion[]
  academyAccessAliases?: readonly CatalogShadowAccessExpansion[]
  nonEntitlementGrants?: readonly CatalogShadowNonEntitlementGrant[]
  variants?: readonly CatalogShadowProductVariant[]
  aliases?: readonly CatalogShadowAlias[]
  revenuePath?: string | null
  fulfillmentContract?: string | null
  provenance: CatalogShadowProvenance
}

export interface CatalogShadowDatabaseProductSnapshot {
  id: string
  title?: string | null
  active: boolean
  purchasable: boolean
  membershipIncluded?: boolean | null
  stripePriceId?: string | null
  currency?: CatalogShadowCurrency | null
  provenance: CatalogShadowProvenance
}

export interface CatalogShadowDatabaseOverrideSnapshot {
  productId: string
  priceCents?: number | null
  active?: boolean | null
  currency?: CatalogShadowCurrency | null
  provenance: CatalogShadowProvenance
}

export interface CatalogShadowEffectiveAcademyProductSnapshot {
  id: string
  active: boolean
  purchasable: boolean
  membershipIncluded?: boolean | null
  priceCents?: number | null
  currency?: CatalogShadowCurrency | null
  stripePriceId?: string | null
  provenance: CatalogShadowProvenance
}

export type CatalogShadowSourceSnapshot<T> =
  | {
      state: "available"
      rows: readonly T[]
      provenance: CatalogShadowProvenance
    }
  | {
      state: "empty" | "missing" | "unavailable"
      rows?: readonly never[]
      reason?: string
      provenance: CatalogShadowProvenance
    }

export interface CatalogShadowDatabaseSnapshot {
  products: CatalogShadowSourceSnapshot<CatalogShadowDatabaseProductSnapshot>
  overrides: CatalogShadowSourceSnapshot<CatalogShadowDatabaseOverrideSnapshot>
}

export type CatalogShadowEffectiveAcademySnapshot =
  | {
      state: "available"
      products: readonly CatalogShadowEffectiveAcademyProductSnapshot[]
      provenance: CatalogShadowProvenance
    }
  | {
      state: "empty" | "unavailable"
      products?: readonly never[]
      reason?: string
      provenance: CatalogShadowProvenance
    }

export interface CatalogShadowPublicPriceLiteral {
  productId: string
  literal: string
  amountCents: number
  currency: CatalogShadowCurrency
  provenance: CatalogShadowProvenance
}

export interface CatalogShadowPublicPriceProbe {
  productId: string
  literal: string
  status: "observed" | "missing" | "unavailable"
  amountCents?: number
  currency?: CatalogShadowCurrency
  reason?: string
  provenance: CatalogShadowProvenance
}

export interface CatalogShadowPublicCopySnapshot {
  state: "complete" | "partial" | "unavailable"
  probes: readonly CatalogShadowPublicPriceProbe[]
  provenance: CatalogShadowProvenance
}

export interface CatalogShadowInput {
  now: Date
  codeProducts: readonly CatalogShadowCodeProductSnapshot[]
  database: CatalogShadowDatabaseSnapshot
  academyEffective: CatalogShadowEffectiveAcademySnapshot
  publicCopy: CatalogShadowPublicCopySnapshot
  failure?: {
    reason: string
    provenance: CatalogShadowProvenance
  }
}

export interface CatalogShadowFinding {
  code: CatalogShadowFindingCode
  severity: CatalogShadowSeverity
  productId: string
  message: string
  provenance: readonly CatalogShadowProvenance[]
}

export interface CatalogShadowProductRow {
  id: string
  names: readonly string[]
  sourcePresence: {
    code: boolean
    database: boolean | "unknown"
    academyEffective: boolean | "unknown"
  }
  privatePilot: boolean
  lifecycleStatuses: readonly CatalogShadowLifecycle[]
  observedActive: boolean | null
  observedPurchasable: boolean | null
  databaseActive: boolean | null
  databasePurchasable: boolean | null
  databaseOverrideActive: boolean | null
  academyEffectiveActive: boolean | null
  academyEffectivePurchasable: boolean | null
  projectedHistoricalVisible: boolean
  saleEligibility: "unknown" | "blocked_by_legacy" | "private" | "candidate_from_partial_evidence"
  amountCents: readonly number[]
  currencies: readonly CatalogShadowCurrency[]
  billingIntervals: readonly CatalogShadowBillingInterval[]
  priceReferences: readonly CatalogShadowPriceReference[]
  entitlementGrants: readonly CatalogShadowAccessExpansion[]
  academyAccessAliases: readonly CatalogShadowAccessExpansion[]
  nonEntitlementGrants: readonly CatalogShadowNonEntitlementGrant[]
  variants: readonly CatalogShadowProductVariant[]
  aliases: readonly CatalogShadowAlias[]
  revenuePaths: readonly string[]
  fulfillmentContracts: readonly string[]
  provenance: readonly CatalogShadowProvenance[]
}

export interface CatalogShadowReport {
  schemaVersion: 1
  generatedAt: string
  status: "complete" | "failed"
  mode: "shadow_read_only"
  stripeVerification: "not_requested"
  database: {
    products: {
      state: CatalogShadowSourceSnapshot<CatalogShadowDatabaseProductSnapshot>["state"]
      reason: string | null
      provenance: CatalogShadowProvenance
    }
    overrides: {
      state: CatalogShadowSourceSnapshot<CatalogShadowDatabaseOverrideSnapshot>["state"]
      reason: string | null
      provenance: CatalogShadowProvenance
    }
  }
  academyEffective: {
    state: "available" | "empty" | "unavailable"
    reason: string | null
    provenance: CatalogShadowProvenance
  }
  publicCopy: {
    state: "complete" | "partial" | "unavailable"
    provenance: CatalogShadowProvenance
  }
  rows: readonly CatalogShadowProductRow[]
  findings: readonly CatalogShadowFinding[]
  summary: {
    rowCount: number
    findingCount: number
    blockers: number
    warnings: number
    info: number
  }
}

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
}

function provenanceKey(value: CatalogShadowProvenance): string {
  return [value.source, value.observation || "", value.location, value.detail || ""].join("\u0000")
}

function sortProvenance(values: Iterable<CatalogShadowProvenance>): CatalogShadowProvenance[] {
  const byKey = new Map<string, CatalogShadowProvenance>()
  for (const value of values) byKey.set(provenanceKey(value), value)
  return Array.from(byKey.values()).sort((left, right) =>
    provenanceKey(left).localeCompare(provenanceKey(right))
  )
}

function sortAliases(values: Iterable<CatalogShadowAlias>): CatalogShadowAlias[] {
  const byKey = new Map<string, CatalogShadowAlias>()
  for (const value of values) {
    byKey.set(`${value.kind}\u0000${value.value}\u0000${provenanceKey(value.provenance)}`, value)
  }
  return Array.from(byKey.values()).sort((left, right) => {
    const leftKey = `${left.kind}\u0000${left.value}\u0000${provenanceKey(left.provenance)}`
    const rightKey = `${right.kind}\u0000${right.value}\u0000${provenanceKey(right.provenance)}`
    return leftKey.localeCompare(rightKey)
  })
}

function isReferenceEffective(reference: CatalogShadowPriceReference, nowMillis: number): boolean {
  if (typeof reference.selectedAtObservation === "boolean") {
    return reference.selectedAtObservation
  }
  // Conditional checkout branches are configuration coverage, not an observed global selection.
  if (reference.condition) return false
  const fromMillis = reference.effectiveFrom
    ? Date.parse(reference.effectiveFrom)
    : Number.NEGATIVE_INFINITY
  const untilMillis = reference.effectiveUntil
    ? Date.parse(reference.effectiveUntil)
    : Number.POSITIVE_INFINITY
  return nowMillis >= fromMillis && nowMillis < untilMillis
}

function sortPriceReferences(
  values: Iterable<CatalogShadowPriceReference>
): CatalogShadowPriceReference[] {
  const byKey = new Map<string, CatalogShadowPriceReference>()
  for (const value of values) {
    const key = [
      value.envKey,
      value.priceId || "",
      String(value.selectedAtObservation ?? ""),
      value.scenario || "",
      value.condition || "",
      value.effectiveFrom || "",
      value.effectiveUntil || "",
      provenanceKey(value.provenance),
    ].join("\u0000")
    byKey.set(key, value)
  }
  return Array.from(byKey.values()).sort((left, right) => {
    const leftKey = [
      left.effectiveFrom || "",
      left.effectiveUntil || "",
      String(left.selectedAtObservation ?? ""),
      left.scenario || "",
      left.condition || "",
      left.envKey,
      left.priceId || "",
    ].join("\u0000")
    const rightKey = [
      right.effectiveFrom || "",
      right.effectiveUntil || "",
      String(right.selectedAtObservation ?? ""),
      right.scenario || "",
      right.condition || "",
      right.envKey,
      right.priceId || "",
    ].join("\u0000")
    return leftKey.localeCompare(rightKey)
  })
}

function sortAccessExpansions(
  values: Iterable<CatalogShadowAccessExpansion>
): CatalogShadowAccessExpansion[] {
  const byKey = new Map<string, CatalogShadowAccessExpansion>()
  for (const value of values) {
    byKey.set(
      `${value.productId}\u0000${value.condition || ""}\u0000${provenanceKey(value.provenance)}`,
      value
    )
  }
  return Array.from(byKey.values()).sort((left, right) => {
    const leftKey = `${left.productId}\u0000${left.condition || ""}\u0000${provenanceKey(left.provenance)}`
    const rightKey = `${right.productId}\u0000${right.condition || ""}\u0000${provenanceKey(right.provenance)}`
    return leftKey.localeCompare(rightKey)
  })
}

function sortVariants(
  values: Iterable<CatalogShadowProductVariant>
): CatalogShadowProductVariant[] {
  return Array.from(values).sort((left, right) => left.id.localeCompare(right.id))
}

function sortNonEntitlementGrants(
  values: Iterable<CatalogShadowNonEntitlementGrant>
): CatalogShadowNonEntitlementGrant[] {
  const byKey = new Map<string, CatalogShadowNonEntitlementGrant>()
  for (const value of values) {
    byKey.set(`${value.kind}\u0000${value.id}\u0000${provenanceKey(value.provenance)}`, value)
  }
  return Array.from(byKey.values()).sort((left, right) => {
    const leftKey = `${left.kind}\u0000${left.id}\u0000${provenanceKey(left.provenance)}`
    const rightKey = `${right.kind}\u0000${right.id}\u0000${provenanceKey(right.provenance)}`
    return leftKey.localeCompare(rightKey)
  })
}

function finding(input: CatalogShadowFinding): CatalogShadowFinding {
  return { ...input, provenance: sortProvenance(input.provenance) }
}

function buildRows(input: CatalogShadowInput): CatalogShadowProductRow[] {
  const databaseProducts =
    input.database.products.state === "available" ? input.database.products.rows : []
  const databaseOverrides =
    input.database.overrides.state === "available" ? input.database.overrides.rows : []
  const effectiveProducts =
    input.academyEffective.state === "available" ? input.academyEffective.products : []
  const ids = uniqueSorted([
    ...input.codeProducts.map(product => product.id),
    ...databaseProducts.map(product => product.id),
    ...databaseOverrides.map(override => override.productId),
    ...effectiveProducts.map(product => product.id),
  ])
  const databaseProductsKnown =
    input.database.products.state === "available" || input.database.products.state === "empty"
  const databaseOverridesKnown =
    input.database.overrides.state === "available" || input.database.overrides.state === "empty"
  const effectiveKnown =
    input.academyEffective.state === "available" || input.academyEffective.state === "empty"
  const sourceEvidenceKnown = databaseProductsKnown && databaseOverridesKnown && effectiveKnown

  return ids.map(id => {
    const code = input.codeProducts.filter(product => product.id === id)
    const database = databaseProducts.filter(product => product.id === id)
    const overrides = databaseOverrides.filter(override => override.productId === id)
    const effective = effectiveProducts.filter(product => product.id === id)
    const lifecycleStatuses = uniqueSorted(
      code.flatMap(product => (product.lifecycleStatus ? [product.lifecycleStatus] : []))
    ) as CatalogShadowLifecycle[]
    const archived = lifecycleStatuses.some(
      status => status === "archived" || status === "legacy_access_only"
    )
    const codeActive = code
      .map(product => product.effectiveActive)
      .filter((value): value is boolean => typeof value === "boolean")
    const dbActive = database.map(product => product.active)
    const overrideActive = overrides
      .map(override => override.active)
      .filter((value): value is boolean => typeof value === "boolean")
    const effectiveActive = effective.map(product => product.active)
    const codePurchasable = code
      .map(product => product.effectivePurchasable)
      .filter((value): value is boolean => typeof value === "boolean")
    const dbPurchasable = database.map(product => product.purchasable)
    const effectivePurchasable = effective.map(product => product.purchasable)
    const observedActiveValues = [...codeActive, ...effectiveActive]
    const observedPurchasableValues = [...codePurchasable, ...effectivePurchasable]
    const observedActive = observedActiveValues.length ? observedActiveValues.some(Boolean) : null
    const observedPurchasable = observedPurchasableValues.length
      ? observedPurchasableValues.some(Boolean)
      : null

    const aliases = sortAliases(code.flatMap(product => product.aliases || []))
    // Preserve every historical identifier even when a source forgot to declare its own product id.
    for (const product of code) {
      aliases.push({ kind: "product_id", value: product.id, provenance: product.provenance })
    }

    return {
      id,
      names: uniqueSorted([
        ...code.flatMap(product => (product.name ? [product.name] : [])),
        ...database.flatMap(product => (product.title ? [product.title] : [])),
      ]),
      sourcePresence: {
        code: code.length > 0,
        database:
          database.length > 0 || overrides.length > 0
            ? true
            : databaseProductsKnown && databaseOverridesKnown
              ? false
              : "unknown",
        academyEffective: effectiveKnown ? effective.length > 0 : "unknown",
      },
      privatePilot: code.some(product => product.privatePilot === true),
      lifecycleStatuses,
      observedActive,
      observedPurchasable,
      databaseActive: dbActive.length ? dbActive.some(Boolean) : null,
      databasePurchasable: dbPurchasable.length ? dbPurchasable.some(Boolean) : null,
      databaseOverrideActive: overrideActive.length ? overrideActive.some(Boolean) : null,
      academyEffectiveActive: effectiveActive.length ? effectiveActive.some(Boolean) : null,
      academyEffectivePurchasable: effectivePurchasable.length
        ? effectivePurchasable.some(Boolean)
        : null,
      projectedHistoricalVisible:
        archived ||
        code.length > 0 ||
        database.length > 0 ||
        overrides.length > 0 ||
        effective.length > 0,
      // This is deliberately not current sale availability. Checkout-specific campaign, bundle,
      // allowlist, and account gates are outside this shadow observation.
      saleEligibility: archived
        ? "blocked_by_legacy"
        : code.some(product => product.privatePilot) || lifecycleStatuses.includes("private")
          ? "private"
          : observedPurchasable === true && sourceEvidenceKnown
            ? "candidate_from_partial_evidence"
            : "unknown",
      amountCents: Array.from(
        new Set([
          ...code.flatMap(product =>
            typeof product.amountCents === "number" ? [product.amountCents] : []
          ),
          ...overrides.flatMap(override =>
            typeof override.priceCents === "number" ? [override.priceCents] : []
          ),
          ...effective.flatMap(product =>
            typeof product.priceCents === "number" ? [product.priceCents] : []
          ),
        ])
      ).sort((left, right) => left - right),
      currencies: uniqueSorted([
        ...code.flatMap(product => (product.currency ? [product.currency] : [])),
        ...database.flatMap(product => (product.currency ? [product.currency] : [])),
        ...overrides.flatMap(override => (override.currency ? [override.currency] : [])),
        ...effective.flatMap(product => (product.currency ? [product.currency] : [])),
      ]) as CatalogShadowCurrency[],
      billingIntervals: uniqueSorted(
        code.flatMap(product => (product.billingInterval ? [product.billingInterval] : []))
      ) as CatalogShadowBillingInterval[],
      priceReferences: sortPriceReferences([
        ...code.flatMap(product => product.priceReferences || []),
        ...database.flatMap(product =>
          product.stripePriceId
            ? [
                {
                  envKey: "database.academy_products.stripe_price_id",
                  priceId: product.stripePriceId,
                  status: "configured_unverified" as const,
                  provenance: product.provenance,
                },
              ]
            : []
        ),
        ...effective.flatMap(product =>
          product.stripePriceId
            ? [
                {
                  envKey: "academy_effective.stripe_price_id",
                  priceId: product.stripePriceId,
                  status: "configured_unverified" as const,
                  provenance: product.provenance,
                },
              ]
            : []
        ),
      ]),
      entitlementGrants: sortAccessExpansions(
        code.flatMap(product => product.entitlementGrants || [])
      ),
      academyAccessAliases: sortAccessExpansions(
        code.flatMap(product => product.academyAccessAliases || [])
      ),
      nonEntitlementGrants: sortNonEntitlementGrants(
        code.flatMap(product => product.nonEntitlementGrants || [])
      ),
      variants: sortVariants(code.flatMap(product => product.variants || [])),
      aliases: sortAliases(aliases),
      revenuePaths: uniqueSorted(
        code.flatMap(product => (product.revenuePath ? [product.revenuePath] : []))
      ),
      fulfillmentContracts: uniqueSorted(
        code.flatMap(product => (product.fulfillmentContract ? [product.fulfillmentContract] : []))
      ),
      provenance: sortProvenance([
        ...code.map(product => product.provenance),
        ...database.map(product => product.provenance),
        ...overrides.map(override => override.provenance),
        ...effective.map(product => product.provenance),
      ]),
    }
  })
}

function buildFindings(
  input: CatalogShadowInput,
  rows: readonly CatalogShadowProductRow[]
): CatalogShadowFinding[] {
  const findings: CatalogShadowFinding[] = []
  const nowMillis = input.now.getTime()
  const databaseProducts =
    input.database.products.state === "available" ? input.database.products.rows : []
  const databaseOverrides =
    input.database.overrides.state === "available" ? input.database.overrides.rows : []
  const academyEffectiveProducts =
    input.academyEffective.state === "available" ? input.academyEffective.products : []

  for (const row of rows) {
    const code = input.codeProducts.filter(product => product.id === row.id)
    const database = databaseProducts.filter(product => product.id === row.id)
    const overrides = databaseOverrides.filter(override => override.productId === row.id)
    const academyEffective = academyEffectiveProducts.filter(product => product.id === row.id)
    const effectiveReferences = row.priceReferences.filter(reference =>
      isReferenceEffective(reference, nowMillis)
    )
    const configuredEffectiveReferences = effectiveReferences.filter(reference => reference.priceId)
    const configuredCodePriceCoverage = code
      .flatMap(product => product.priceReferences || [])
      .filter(
        reference =>
          reference.priceId && (reference.condition || isReferenceEffective(reference, nowMillis))
      )
    const effectiveNonDbPriceIds = new Set(
      configuredEffectiveReferences
        .filter(
          reference =>
            reference.provenance.source !== "database" ||
            reference.provenance.observation === "academy_effective"
        )
        .map(reference => reference.priceId as string)
    )
    const dbPriceIds = new Set(
      database.flatMap(product => (product.stripePriceId ? [product.stripePriceId] : []))
    )

    const privateLivePair =
      row.privatePilot &&
      row.lifecycleStatuses.length === 2 &&
      row.lifecycleStatuses.includes("private") &&
      row.lifecycleStatuses.includes("live")
    if (row.lifecycleStatuses.length > 1 && !privateLivePair) {
      findings.push(
        finding({
          code: "LIFECYCLE_CONFLICT",
          severity: "blocker",
          productId: row.id,
          message: `Conflicting lifecycle states: ${row.lifecycleStatuses.join(", ")}.`,
          provenance: code.map(product => product.provenance),
        })
      )
    }

    if (
      (database.some(product => product.active === false) ||
        overrides.some(override => override.active === false)) &&
      academyEffective.some(product => product.active === true)
    ) {
      findings.push(
        finding({
          code: "DB_DISABLED_BUT_EFFECTIVE_ACTIVE",
          severity: "blocker",
          productId: row.id,
          message:
            "The database disables this product, but a code fallback makes it effectively active.",
          provenance: [
            ...database.map(product => product.provenance),
            ...overrides.map(override => override.provenance),
            ...academyEffective.map(product => product.provenance),
          ],
        })
      )
    }

    if (
      database.some(product => product.purchasable === false) &&
      academyEffective.some(product => product.purchasable === true)
    ) {
      findings.push(
        finding({
          code: "DB_NONPURCHASABLE_BUT_EFFECTIVE_PURCHASABLE",
          severity: "blocker",
          productId: row.id,
          message:
            "The database marks this product non-purchasable, but code fallback logic re-enables purchase.",
          provenance: [
            ...database.map(product => product.provenance),
            ...academyEffective.map(product => product.provenance),
          ],
        })
      )
    }

    if (dbPriceIds.size > 0 && effectiveNonDbPriceIds.size > 0) {
      const different = Array.from(dbPriceIds).some(priceId => !effectiveNonDbPriceIds.has(priceId))
      if (different) {
        findings.push(
          finding({
            code: "DB_PRICE_SHADOWED_BY_CODE",
            severity: "blocker",
            productId: row.id,
            message:
              "The code/environment price reference takes precedence over a different database price reference.",
            provenance: row.priceReferences.map(reference => reference.provenance),
          })
        )
      }
    }

    const effectivePriceIds = uniqueSorted(
      configuredEffectiveReferences.map(reference => reference.priceId as string)
    )
    if (effectivePriceIds.length > 1) {
      findings.push(
        finding({
          code: "PRICE_REFERENCE_CONFLICT",
          severity: "blocker",
          productId: row.id,
          message: `Multiple effective price references disagree: ${effectivePriceIds.join(", ")}.`,
          provenance: configuredEffectiveReferences.map(reference => reference.provenance),
        })
      )
    }

    const needsStripePrice = code.some(
      product =>
        product.effectivePurchasable === true &&
        (product.priceMode || "stripe_price") === "stripe_price"
    )
    if (needsStripePrice && configuredCodePriceCoverage.length === 0) {
      findings.push(
        finding({
          code: "MISSING_PRICE_CONFIGURATION",
          severity: "blocker",
          productId: row.id,
          message:
            "An effectively purchasable Stripe-price product has no configured effective price reference.",
          provenance: code.map(product => product.provenance),
        })
      )
    }

    const priced =
      row.amountCents.some(amount => amount > 0) || configuredEffectiveReferences.length > 0
    const publicObservations = input.publicCopy.probes.filter(
      probe => probe.productId === row.id && probe.status === "observed"
    )
    const comparedAmounts = Array.from(
      new Set([
        ...row.amountCents,
        ...publicObservations.flatMap(probe =>
          typeof probe.amountCents === "number" ? [probe.amountCents] : []
        ),
      ])
    ).sort((left, right) => left - right)
    if (comparedAmounts.length > 1) {
      findings.push(
        finding({
          code: "AMOUNT_CONFLICT",
          severity: "blocker",
          productId: row.id,
          message: `Observed amounts disagree: ${comparedAmounts.join(", ")} cents.`,
          provenance: [...row.provenance, ...publicObservations.map(probe => probe.provenance)],
        })
      )
    }
    const comparedCurrencies = uniqueSorted([
      ...row.currencies,
      ...publicObservations.flatMap(probe => (probe.currency ? [probe.currency] : [])),
    ])
    if (comparedCurrencies.length > 1) {
      findings.push(
        finding({
          code: "CURRENCY_CONFLICT",
          severity: "blocker",
          productId: row.id,
          message: `Observed currencies disagree: ${comparedCurrencies.join(", ")}.`,
          provenance: [...row.provenance, ...publicObservations.map(probe => probe.provenance)],
        })
      )
    }
    if (priced && row.currencies.length === 0) {
      findings.push(
        finding({
          code: "CURRENCY_UNKNOWN",
          severity: "warning",
          productId: row.id,
          message:
            "Currency is unknown; the shadow projection does not infer it from symbols, comments, or price IDs.",
          provenance: row.provenance,
        })
      )
    }

    if (row.sourcePresence.code && row.sourcePresence.database === false) {
      findings.push(
        finding({
          code: "CODE_ONLY_PRODUCT",
          severity: "info",
          productId: row.id,
          message:
            "Product exists in code but not in the available database snapshot; it remains in the shadow row set.",
          provenance: code.map(product => product.provenance),
        })
      )
    }
    if (!row.sourcePresence.code && row.sourcePresence.database === true) {
      findings.push(
        finding({
          code: "DB_ONLY_PRODUCT",
          severity: "warning",
          productId: row.id,
          message:
            "Product exists in the database but not in the injected code snapshot; it remains in the shadow row set.",
          provenance: [
            ...database.map(product => product.provenance),
            ...overrides.map(override => override.provenance),
            ...academyEffective.map(product => product.provenance),
          ],
        })
      )
    }

    const effectivelyPurchasable =
      code.some(product => product.effectivePurchasable === true) ||
      academyEffective.some(product => product.purchasable === true)
    if (effectivelyPurchasable && row.revenuePaths.length === 0) {
      findings.push(
        finding({
          code: "MISSING_REVENUE_PATH",
          severity: "blocker",
          productId: row.id,
          message:
            "An effectively purchasable product has no declared revenue path in the injected code sources.",
          provenance: row.provenance,
        })
      )
    }
    if (effectivelyPurchasable && row.fulfillmentContracts.length === 0) {
      findings.push(
        finding({
          code: "MISSING_FULFILLMENT_CONTRACT",
          severity: "blocker",
          productId: row.id,
          message:
            "An effectively purchasable product has no declared fulfillment contract in the injected code sources.",
          provenance: row.provenance,
        })
      )
    }
  }

  const priceOwners = new Map<
    string,
    Array<{ productId: string; provenance: CatalogShadowProvenance }>
  >()
  for (const row of rows) {
    for (const reference of row.priceReferences) {
      if (!reference.priceId || !isReferenceEffective(reference, nowMillis)) continue
      const owners = priceOwners.get(reference.priceId) || []
      owners.push({ productId: row.id, provenance: reference.provenance })
      priceOwners.set(reference.priceId, owners)
    }
  }
  for (const [priceId, owners] of priceOwners) {
    const productIds = uniqueSorted(owners.map(owner => owner.productId))
    if (productIds.length < 2) continue
    for (const productId of productIds) {
      findings.push(
        finding({
          code: "DUPLICATE_STRIPE_PRICE_REFERENCE",
          severity: "blocker",
          productId,
          message: `Configured Stripe price ${priceId} is referenced by multiple products: ${productIds.join(", ")}.`,
          provenance: owners.map(owner => owner.provenance),
        })
      )
    }
  }

  for (const literal of input.publicCopy.probes.filter(probe => probe.status === "observed")) {
    findings.push(
      finding({
        code: "PUBLIC_PRICE_LITERAL",
        severity: "warning",
        productId: literal.productId,
        message: `Public copy contains a price literal (${literal.literal}); it is comparison evidence, not charge truth.`,
        provenance: [literal.provenance],
      })
    )
  }

  if (input.failure) {
    findings.push(
      finding({
        code: "REPORT_FAILURE",
        severity: "blocker",
        productId: "__report__",
        message: `Catalogue projection failed: ${input.failure.reason}.`,
        provenance: [input.failure.provenance],
      })
    )
  }

  return findings.sort((left, right) => {
    const leftKey = `${left.productId}\u0000${left.code}\u0000${left.message}\u0000${left.severity}`
    const rightKey = `${right.productId}\u0000${right.code}\u0000${right.message}\u0000${right.severity}`
    return leftKey.localeCompare(rightKey)
  })
}

export function createCatalogShadowReport(input: CatalogShadowInput): CatalogShadowReport {
  if (!Number.isFinite(input.now.getTime())) {
    throw new Error("Catalog shadow requires a valid injected now value.")
  }
  const rows = buildRows(input)
  const findings = buildFindings(input, rows)
  return {
    schemaVersion: 1,
    generatedAt: input.now.toISOString(),
    status: input.failure ? "failed" : "complete",
    mode: "shadow_read_only",
    stripeVerification: "not_requested",
    database: {
      products: {
        state: input.database.products.state,
        reason: "reason" in input.database.products ? input.database.products.reason || null : null,
        provenance: input.database.products.provenance,
      },
      overrides: {
        state: input.database.overrides.state,
        reason:
          "reason" in input.database.overrides ? input.database.overrides.reason || null : null,
        provenance: input.database.overrides.provenance,
      },
    },
    academyEffective: {
      state: input.academyEffective.state,
      reason: "reason" in input.academyEffective ? input.academyEffective.reason || null : null,
      provenance: input.academyEffective.provenance,
    },
    publicCopy: {
      state: input.publicCopy.state,
      provenance: input.publicCopy.provenance,
    },
    rows,
    findings,
    summary: {
      rowCount: rows.length,
      findingCount: findings.length,
      blockers: findings.filter(item => item.severity === "blocker").length,
      warnings: findings.filter(item => item.severity === "warning").length,
      info: findings.filter(item => item.severity === "info").length,
    },
  }
}

export function serializeCatalogShadowReport(report: CatalogShadowReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}
