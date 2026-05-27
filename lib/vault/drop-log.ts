// Vault email drop log — version-controlled source of truth.
//
// HOW IT WORKS:
//   After adding 2 new collections to the vault (per the SOP), Sandra sets
//   `automationApproved: true` and `dryRun: false` here and calls
//   POST /api/vault/email-drop to trigger the send.
//
//   After a successful send, update each included collection's
//   `includedInEmailDrop` to `true` and set `automationApproved` back to
//   `false` so the system is safe at rest.
//
// SAFETY DEFAULTS:
//   automationApproved = false → the API route refuses to send anything
//   dryRun             = true  → logs recipients + preview, no actual emails sent

export const VAULT_EMAIL_CONFIG = {
  /** Must be set to true before /api/vault/email-drop will send anything. */
  automationApproved: false,

  /** When true: log recipients + preview HTML, never call sendEmail(). */
  dryRun: true,

  /** Displayed in the non-buyer upsell subject line and email header. */
  dropLabel: "Two New Shoots Just Dropped",
} as const

// ── Collection registry ────────────────────────────────────────────────────
//
// One entry per collection in chronological add order.
// `includedInEmailDrop: false` = not yet included in any email drop.
// `includedInEmailDrop: true`  = already emailed to the list.
//
// Do NOT change `id` values — they are used to match VAULT_COLLECTION_META
// entries in prompt-data.ts.

export type VaultDropCollection = {
  id: string
  name: string
  /** Path to the hero image for this collection (used in email). */
  heroImage: string
  /** Short mood line shown under the collection name in email. */
  moodLine: string
  /** Has this collection been included in an email drop? */
  includedInEmailDrop: boolean
  /** ISO date string of when the drop email was sent. Null if not yet sent. */
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
    id: "coastal-white",
    name: "Coastal White Dress Sunset Editorial",
    heroImage: "/images/ai-prompts/coastal-white-shot-1.jpg",
    moodLine: "White linen. Salt air. Golden light on water.",
    includedInEmailDrop: false,
    droppedAt: null,
  },
  {
    id: "dark-balcony",
    name: "Dark Balcony Luxury City Editorial",
    heroImage: "/images/ai-prompts/dark-balcony-shot-1.png",
    moodLine: "City lights below. Evening silk. Luxury.",
    includedInEmailDrop: false,
    droppedAt: null,
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
