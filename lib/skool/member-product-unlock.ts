/**
 * Membership unlocks for token-delivered products.
 *
 * Most academy products are gated by entitlement alone: `membershipIncluded` puts
 * them in `accessibleProductIds` and the page renders. A few are delivered through
 * a per-buyer access token minted at purchase — Prompt Vault, the AI Photos Kit and
 * the Presets collections. For those, entitlement is necessary but not sufficient:
 * a member who never bought has no token row, so the access page finds nothing and
 * bounces her to the sales page.
 *
 * These helpers mint that row on first visit, reusing the exact purchase-path
 * function so a member's token is indistinguishable from a buyer's. All three are
 * idempotent — an existing token is reused, never replaced, because the token is
 * baked into delivery emails.
 */

import { ensurePaidSelfieAiPhotosKitSubscriber } from "@/lib/freebie/selfie-ai-photos-kit-access"
import { upsertPromptVaultSubscriber } from "@/lib/payments/handlers/prompt-vault"
import { upsertPresetOrderForPurchase } from "@/lib/presets/orders"

/**
 * Preset orders dedupe on `stripe_session_id`. A membership unlock has no Stripe
 * session, so it gets a stable synthetic one derived from the user id: the same
 * member always resolves to the same order instead of accumulating one per visit.
 * The prefix keeps it obviously non-Stripe in the data.
 */
function membershipPresetOrderId(userId: string): string {
  return `skool-membership:${userId}`
}

export async function unlockPromptVaultForMember(email: string, name?: string | null) {
  const subscriber = await upsertPromptVaultSubscriber(email, name)
  return subscriber?.accessToken ?? null
}

export async function unlockAiPhotosKitForMember(email: string, name?: string | null) {
  const subscriber = await ensurePaidSelfieAiPhotosKitSubscriber(email, name)
  return subscriber?.accessToken ?? null
}

export async function unlockPresetsForMember(
  userId: string,
  email: string,
  name?: string | null,
) {
  // The Full Collection strictly contains the Single, so members get the bundle.
  const order = await upsertPresetOrderForPurchase({
    email,
    name,
    tier: "bundle",
    stripeSessionId: membershipPresetOrderId(userId),
    metadata: { grantedBy: "skool_membership", userId },
  })
  return order?.accessToken ?? null
}
