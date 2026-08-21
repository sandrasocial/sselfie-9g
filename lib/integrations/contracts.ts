export const BUSINESS_EVENT_TYPES = [
  "lead_captured",
  "checkout_started",
  "product_purchased",
  "membership_started",
  "membership_ended",
  "result_completed",
] as const

export const INTEGRATION_PROVIDERS = [
  "sselfie",
  "stripe",
  "resend",
  "manychat",
  "skool",
  "studio_platform_partner",
] as const
export const INTEGRATION_SCOPES = [
  "account",
  "audience",
  "community",
  "creator_program",
  "membership",
] as const
export const INTEGRATION_OPERATIONS = ["provision", "deprovision", "synchronize"] as const
export const INTEGRATION_RESOURCE_TYPES = [
  "external_account",
  "audience_membership",
  "community_membership",
  "creator_enrollment",
  "membership_access",
] as const

export type BusinessEventType = (typeof BUSINESS_EVENT_TYPES)[number]
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number]
export type IntegrationScope = (typeof INTEGRATION_SCOPES)[number]
export type IntegrationOperation = (typeof INTEGRATION_OPERATIONS)[number]
export type IntegrationResourceType = (typeof INTEGRATION_RESOURCE_TYPES)[number]
export type DesiredProvisioningState = "present" | "absent"
export type ObservedProvisioningState =
  | "unknown"
  | "pending"
  | "present"
  | "absent"
  | "failed"
  | "blocked"
export type ExternalAccountStatus = "pending" | "active" | "disabled" | "failed" | "blocked"
export type IntegrationOutboxStatus =
  | "pending"
  | "claimed"
  | "retry"
  | "succeeded"
  | "dead_letter"
  | "cancelled"
export type JsonScalar = string | number | boolean | null
export type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue }

export interface BusinessEventInput {
  eventType: BusinessEventType
  schemaVersion: 1
  aggregateType: string
  aggregateId: string
  subjectType: string
  subjectId: string
  userId?: string | null
  sourceProvider?: IntegrationProvider
  sourceEventId?: string
  idempotencyKey: string
  occurredAt: Date
  attributes: JsonObject
}

export interface DesiredProvisioningInput {
  userId: string
  provider: IntegrationProvider
  scopeKey: IntegrationScope
  resourceType: IntegrationResourceType
  resourceId: string
  desiredState: DesiredProvisioningState
}

export interface IntegrationOutboxInput {
  provider: IntegrationProvider
  scopeKey: IntegrationScope
  operation: IntegrationOperation
  businessKey: string
  destinationKey: string
  idempotencyKey: string
  maxAttempts?: number
}

const identifierPattern = /^[a-z][a-z0-9_.:-]{0,127}$/
const forbiddenKeyFragments = [
  "email",
  "firstname",
  "lastname",
  "fullname",
  "name",
  "phone",
  "recipient",
  "token",
  "secret",
  "authorization",
  "password",
  "credential",
  "apikey",
  "address",
  "contact",
  "raw",
  "payload",
  "url",
]

const EVENT_ATTRIBUTE_KEYS: Record<BusinessEventType, ReadonlySet<string>> = {
  lead_captured: new Set(["lead_source", "campaign_id", "offer_id"]),
  checkout_started: new Set(["product_id", "checkout_kind", "currency", "amount_minor"]),
  product_purchased: new Set([
    "product_id",
    "amount_minor",
    "currency",
    "billing_interval",
    "quantity",
  ]),
  membership_started: new Set(["membership_id", "plan_id", "billing_interval", "effective_at"]),
  membership_ended: new Set(["membership_id", "plan_id", "reason_code", "effective_at"]),
  result_completed: new Set(["result_type", "result_id", "method_stage"]),
}

const RESERVED_INTERNAL_KEY_ALIASES = new Set(["studio", "academy", "membership", "suite"])
const SENSITIVE_KEY_VALUE_FRAGMENTS = [
  "email",
  "phone",
  "recipient",
  "token",
  "secret",
  "authorization",
  "password",
  "apikey",
  "url",
]

function assertAllowed<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
): asserts value is T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`Unknown integration ${label}`)
  }
}

function assertIdentifier(
  value: unknown,
  label: string,
  pattern = identifierPattern
): asserts value is string {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error(`Invalid ${label}`)
}

function assertOpaqueIdentifier(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.:-]{1,256}$/.test(value)) {
    throw new Error(`Invalid ${label}`)
  }
}

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function assertSafeJson(value: unknown, path: string, depth: number): asserts value is JsonValue {
  if (depth > 12) throw new Error(`Attributes exceed maximum depth at ${path}`)
  if (value === null || typeof value === "boolean") return
  if (typeof value === "string") {
    if (
      /@/.test(value) ||
      /(?:https?:\/\/|bearer\s+|\b(?:token|secret|password|authorization|api[_-]?key)\s*[=:])/i.test(
        value
      )
    ) {
      throw new Error(`Attributes contain a PII-like or secret-like value at ${path}`)
    }
    return
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error(`Attributes contain a non-finite number at ${path}`)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeJson(item, `${path}[${index}]`, depth + 1))
    return
  }
  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`Attributes must contain only JSON values at ${path}`)
  }
  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizedKey(key)
    if (forbiddenKeyFragments.some(fragment => normalized.includes(fragment))) {
      throw new Error(`Attributes contain forbidden key at ${path}.${key}`)
    }
    assertSafeJson(child, `${path}.${key}`, depth + 1)
  }
}

export function assertBusinessEventInput(input: BusinessEventInput): BusinessEventInput {
  if (!input || typeof input !== "object") throw new Error("Business event must be an object")
  assertAllowed(input.eventType, BUSINESS_EVENT_TYPES, "event type")
  if (input.schemaVersion !== 1) throw new Error("Unsupported business event schema version")
  assertIdentifier(input.aggregateType, "aggregate type")
  assertOpaqueIdentifier(input.aggregateId, "aggregate id")
  assertIdentifier(input.subjectType, "subject type")
  assertOpaqueIdentifier(input.subjectId, "subject id")
  assertOpaqueIdentifier(input.idempotencyKey, "idempotency key")
  if (!(input.occurredAt instanceof Date) || !Number.isFinite(input.occurredAt.getTime())) {
    throw new Error("Invalid business event occurrence time")
  }
  if ((input.sourceProvider === undefined) !== (input.sourceEventId === undefined)) {
    throw new Error("Source provider and source event id must be supplied together")
  }
  if (input.sourceProvider !== undefined) {
    assertAllowed(input.sourceProvider, INTEGRATION_PROVIDERS, "provider")
    assertOpaqueIdentifier(input.sourceEventId, "source event id")
  }
  if (input.userId !== undefined && input.userId !== null)
    assertOpaqueIdentifier(input.userId, "user id")
  if (
    !input.attributes ||
    Array.isArray(input.attributes) ||
    Object.getPrototypeOf(input.attributes) !== Object.prototype
  ) {
    throw new Error("Business event attributes must be an object")
  }
  const allowedAttributeKeys = EVENT_ATTRIBUTE_KEYS[input.eventType]
  for (const key of Object.keys(input.attributes)) {
    if (!allowedAttributeKeys.has(key))
      throw new Error(`Unknown ${input.eventType} v1 attribute key: ${key}`)
  }
  assertSafeJson(input.attributes, "attributes", 0)
  return input
}

export function assertIntegrationDestination(input: {
  provider: IntegrationProvider
  scopeKey: IntegrationScope
  operation: IntegrationOperation
}): void {
  assertAllowed(input.provider, INTEGRATION_PROVIDERS, "provider")
  assertAllowed(input.scopeKey, INTEGRATION_SCOPES, "scope")
  assertAllowed(input.operation, INTEGRATION_OPERATIONS, "operation")
}

export function assertDesiredProvisioningInput(input: DesiredProvisioningInput): void {
  assertOpaqueIdentifier(input.userId, "user id")
  assertAllowed(input.provider, INTEGRATION_PROVIDERS, "provider")
  assertAllowed(input.scopeKey, INTEGRATION_SCOPES, "scope")
  assertAllowed(input.resourceType, INTEGRATION_RESOURCE_TYPES, "resource type")
  assertOpaqueIdentifier(input.resourceId, "resource id")
  if (input.desiredState !== "present" && input.desiredState !== "absent") {
    throw new Error("Unknown desired provisioning state")
  }
}

export function assertIntegrationOutboxInput(input: IntegrationOutboxInput): void {
  assertIntegrationDestination(input)
  assertOpaqueIdentifier(input.businessKey, "business key")
  assertOpaqueIdentifier(input.destinationKey, "destination key")
  if (!input.destinationKey.startsWith(`${input.provider}:`)) {
    throw new Error("Destination key must start with the exact provider prefix")
  }
  assertOpaqueIdentifier(input.idempotencyKey, "outbox idempotency key")
  for (const [label, value] of [
    ["business key", input.businessKey],
    ["destination key", input.destinationKey],
  ] as const) {
    const leadingNamespace = value.toLowerCase().split(/[^a-z0-9]+/, 1)[0]
    if (
      label === "business key" &&
      leadingNamespace &&
      RESERVED_INTERNAL_KEY_ALIASES.has(leadingNamespace)
    ) {
      throw new Error(`${label} aliases a reserved internal product name`)
    }
    const normalized = normalizedKey(value)
    if (SENSITIVE_KEY_VALUE_FRAGMENTS.some(fragment => normalized.includes(fragment))) {
      throw new Error(`${label} contains a PII-like or secret-like value`)
    }
  }
  const normalizedIdempotencyKey = normalizedKey(input.idempotencyKey)
  if (SENSITIVE_KEY_VALUE_FRAGMENTS.some(fragment => normalizedIdempotencyKey.includes(fragment))) {
    throw new Error("Outbox idempotency key contains a PII-like or secret-like value")
  }
  if (
    input.maxAttempts !== undefined &&
    (!Number.isInteger(input.maxAttempts) || input.maxAttempts < 1 || input.maxAttempts > 20)
  ) {
    throw new Error("Outbox max attempts must be between 1 and 20")
  }
}

export function sanitizeIntegrationError(_error: unknown): { code: string; message: string } {
  return { code: "INTEGRATION_ERROR", message: "Integration provider operation failed" }
}
