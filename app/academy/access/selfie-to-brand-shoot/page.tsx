import { redirect } from "next/navigation"
import type { Metadata } from "next"

import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { SelfieToBrandShootSystemShell } from "@/components/selfie-to-brand-shoot/system-shell"

export const metadata: Metadata = {
  title: "Selfie to Brand Shoot System · SSELFIE Academy",
  description: "A lean buyer home for creating your first AI brand shoot from one selfie.",
  robots: { index: false, follow: false },
}

const SUPPORTING_PRODUCT_IDS = new Set([
  "prompt_vault",
  "starter_kit",
  "masterclass",
  "selfie_guide",
  "selfie_guide_bundle",
  "brand_strategy_pack",
])

function getSafeFirstName(name: string | null | undefined) {
  if (!name) return null
  if (name.includes("@")) return null

  const first = name.trim().split(/\s+/)[0]
  if (!first || first.length < 2 || first.length > 32) return null

  return first.charAt(0).toUpperCase() + first.slice(1)
}

async function getPromptVaultSubscriber(email: string | null | undefined) {
  if (!email) return null

  const rows = await sql`
    SELECT access_token, name
    FROM freebie_subscribers
    WHERE LOWER(email) = LOWER(${email})
      AND access_token IS NOT NULL
      AND (
        source = 'prompt-vault-paid'
        OR 'prompt-vault-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        OR 'prompt-vault-admin-access' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
      )
    ORDER BY created_at DESC
    LIMIT 1
  `

  return (rows as { access_token: string; name: string | null }[])[0] ?? null
}

export default async function AcademySelfieToBrandShootAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/selfie-to-brand-shoot")
  const [entitlementState, vaultSubscriber] = await Promise.all([
    getAcademyEntitlementState(neonUser.id),
    getPromptVaultSubscriber(neonUser.email),
  ])

  const hasSupportingAccess =
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.some((productId) => SUPPORTING_PRODUCT_IDS.has(productId)) ||
    Boolean(vaultSubscriber?.access_token)

  if (!hasSupportingAccess) {
    redirect("/prompt-vault?access=selfie-to-brand-shoot")
  }

  const hasPromptVaultAccess =
    entitlementState.accessibleProductIds.includes("prompt_vault") ||
    Boolean(vaultSubscriber?.access_token)

  const vaultHref = vaultSubscriber?.access_token
    ? `/access/prompt-vault/${encodeURIComponent(vaultSubscriber.access_token)}`
    : "/academy/access/prompt-vault"

  logAnalyticsEvent({
    eventName: "academy_home_opened",
    userId: neonUser.id,
    path: "/academy/access/selfie-to-brand-shoot",
    properties: {
      product_id: "selfie_to_brand_shoot_shell",
      source: "academy",
      has_prompt_vault_token: Boolean(vaultSubscriber?.access_token),
      membership_active: entitlementState.membershipActive,
    },
  }).catch(() => {})

  return (
    <SelfieToBrandShootSystemShell
      firstName={getSafeFirstName(vaultSubscriber?.name)}
      vaultHref={vaultHref}
      accessMode="academy"
      hasStudioAccess={entitlementState.membershipActive}
      hasPromptVaultAccess={hasPromptVaultAccess}
    />
  )
}
