// Vault email drop log — version-controlled source of truth.
//
// HOW IT WORKS:
//   1. Add ≥2 collections with includedInEmailDrop: false
//   2. Set automationApproved: true and dryRun: true
//   3. Call POST /api/vault/email-drop to see dry-run preview
//   4. Approve counts, set dryRun: false
//   5. Call POST /api/vault/email-drop to create a live run (returns runId)
//   6. Call POST /api/vault/email-drop/process?runId=... repeatedly (batches of 25)
//   7. Check GET /api/vault/email-drop/status?runId=... to see progress
//   8. After all batches complete, update each sent collection's
//      includedInEmailDrop: true + droppedAt, reset automationApproved: false
//
// SAFETY DEFAULTS:
//   automationApproved = false → start endpoint refuses to create a run
//   dryRun             = true  → start endpoint returns preview only, no run created

export const VAULT_EMAIL_CONFIG = {
  /** Must be set to true before /api/vault/email-drop will do anything real. */
  automationApproved: false,

  /**
   * When true: returns preview (counts, sample recipients, subject lines).
   * Does NOT create a run, does NOT send anything.
   * Set to false only after reviewing the dry-run and getting Sandra's approval.
   */
  dryRun: true,

  /** Max recipients per /process batch call. Keep ≤50 for Vercel timeout safety. */
  maxBatchSize: 25,
} as const

// ── Collection registry ────────────────────────────────────────────────────
//
// One entry per collection in chronological add order.
// `includedInEmailDrop: false` = not yet emailed.
// `includedInEmailDrop: true`  = already included in a completed drop.
//
// Do NOT change `id` values — they are referenced by VAULT_COLLECTION_META
// in prompt-data.ts and form part of the idempotency key in email_logs.

export type VaultDropCollection = {
  id: string
  name: string
  /** Path to the hero image for this collection (used in email). */
  heroImage: string
  /** Short mood line shown under the collection name in email. */
  moodLine: string
  /** Has this collection been included in a completed email drop? */
  includedInEmailDrop: boolean
  /** ISO date string (YYYY-MM-DD) of when the drop email was sent. Null if not yet sent. */
  droppedAt: string | null
}

export const VAULT_COLLECTIONS: VaultDropCollection[] = [
  {
    id: "marble-cafe",
    name: "Marble Café Wine Editorial",
    heroImage: "/images/ai-prompts/marble-wine-shot-1.jpg",
    moodLine: "Candlelit. Marble. Wine at dusk.",
    includedInEmailDrop: true,
    droppedAt: "2026-05-01",
  },
  {
    id: "denim-street",
    name: "Soft Blazer + Light Denim Street Editorial",
    heroImage: "/images/ai-prompts/denim-street-shot-1.jpg",
    moodLine: "Golden hour. City light. Effortless.",
    includedInEmailDrop: true,
    droppedAt: "2026-05-01",
  },
  {
    id: "cozy-leather",
    name: "Cozy Leather + Oversized Knit Mirror Editorial",
    heroImage: "/images/ai-prompts/cozy-leather-shot-1.png",
    moodLine: "Warm tones. Mirror light. Sunday morning.",
    includedInEmailDrop: true,
    droppedAt: "2026-05-01",
  },
  {
    id: "dark-feminine-cafe",
    name: "Dark Feminine Café Coffee-Run Editorial",
    heroImage: "/images/ai-prompts/dark-feminine-cafe-shot-1.jpg",
    moodLine: "Black blazer. Coffee in hand. Moving through the city like you own it.",
    includedInEmailDrop: true,
    droppedAt: "2026-05-30",
  },
  {
    id: "coastal-white",
    name: "Coastal White Dress Sunset Editorial",
    heroImage: "/images/ai-prompts/coastal-white-shot-1.jpg",
    moodLine: "White linen. Salt air. Golden light on water.",
    includedInEmailDrop: true,
    droppedAt: "2026-05-30",
  },
  {
    id: "dark-balcony",
    name: "Dark Balcony Luxury City Editorial",
    heroImage: "/images/ai-prompts/dark-balcony-shot-1.png",
    moodLine: "City lights below. Evening silk. Luxury.",
    includedInEmailDrop: true,
    droppedAt: "2026-05-30",
  },
  {
    id: "clean-girl-morning",
    name: "Clean Girl Founder Morning Editorial",
    heroImage: "/images/ai-prompts/clean-girl-morning-shot-1.jpg",
    moodLine: "Mirror light. Skincare. Coffee. A calm founder morning.",
    includedInEmailDrop: true,
    droppedAt: "2026-05-30",
  },
  {
    id: "noir-femme",
    name: "NOIR FEMME Editorial",
    heroImage: "/images/ai-prompts/noir-femme-shot-3.png",
    moodLine: "Crushed blacks. Street movement. Full cinematic edge.",
    includedInEmailDrop: true,
    droppedAt: "2026-05-30",
  },
]

// ── Derived helpers ────────────────────────────────────────────────────────

/** Collections not yet included in any email drop. */
export function getPendingCollections(): VaultDropCollection[] {
  return VAULT_COLLECTIONS.filter((c) => !c.includedInEmailDrop)
}

/** Whether there are enough new collections to justify an email drop (2+). */
export function isEmailDropReady(): boolean {
  return getPendingCollections().length >= 2
}

/**
 * Deterministic drop key from a set of collection IDs.
 * Sorted alphabetically and joined with '+'.
 * Used as part of the email_type idempotency key in email_logs.
 *
 * Example: ['dark-balcony', 'coastal-white'] → 'coastal-white+dark-balcony'
 */
export function buildDropKey(collections: VaultDropCollection[]): string {
  return [...collections.map((c) => c.id)]
    .sort()
    .join("+")
}

/**
 * email_type written to email_logs for each drop send.
 * Format: vault_drop_{short_hash}_{audience}
 * Example: vault_drop_1g9j3xf_nonbuyer
 *
 * This is the idempotency key. Keep it under 50 chars because email_logs.email_type
 * is varchar(50). The full human-readable drop key is still stored in vault_drop_runs.
 */
function hashDropKey(dropKey: string): string {
  let hash = 2166136261

  for (let i = 0; i < dropKey.length; i++) {
    hash ^= dropKey.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

export function buildDropEmailType(
  dropKey: string,
  audience: "nonbuyer" | "buyer",
): string {
  return `vault_drop_${hashDropKey(dropKey)}_${audience}`
}
