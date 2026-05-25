import { redirect } from "next/navigation"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"
import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"

/**
 * Prompt Vault access gate.
 *
 * Auth -> entitlement/tag check -> look up the buyer's freebie_subscribers token ->
 * redirect to /access/prompt-vault/[token].
 *
 * The token route remains the canonical vault experience so customers can open
 * the vault from their delivery email or from the app library.
 */
export default async function AcademyPromptVaultAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/prompt-vault")

  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const hasEntitlement = entitlementState.accessibleProductIds.includes("prompt_vault")

  const rows = await sql`
    SELECT fs.access_token, fs.email_tags, fs.source
    FROM freebie_subscribers fs
    INNER JOIN users u ON LOWER(u.email) = LOWER(fs.email)
    WHERE u.id = ${neonUser.id}
      AND fs.access_token IS NOT NULL
      AND (
        fs.source = 'prompt-vault-paid'
        OR 'prompt-vault-paid' = ANY(COALESCE(fs.email_tags, ARRAY[]::text[]))
      )
    LIMIT 1
  `

  const token = (rows as { access_token: string }[])[0]?.access_token

  if (token && hasEntitlement) {
    redirect(`/access/prompt-vault/${encodeURIComponent(token)}`)
  }

  // Backward-compatible safety for any buyer whose webhook created the token
  // before Prompt Vault was added to Academy entitlements.
  if (token) {
    redirect(`/access/prompt-vault/${encodeURIComponent(token)}`)
  }

  redirect("/prompt-vault")
}
