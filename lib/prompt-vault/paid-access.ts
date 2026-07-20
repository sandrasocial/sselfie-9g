import "server-only"

import { sql } from "@/lib/db/client"

export type PaidPromptVaultAccess =
  | { valid: false }
  | { valid: true; name: string | null }

export async function getPaidPromptVaultAccess(token: string | null | undefined): Promise<PaidPromptVaultAccess> {
  const normalizedToken = token?.trim()
  if (!normalizedToken || normalizedToken.length > 256) return { valid: false }

  try {
    const rows = await sql`
      SELECT name
      FROM freebie_subscribers
      WHERE access_token = ${normalizedToken}
        AND (
          source = 'prompt-vault-paid'
          OR source = 'selfie-to-brand-shoot-paid'
          OR 'prompt-vault-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
          OR 'selfie-to-brand-shoot-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
          OR 'bought_selfie_to_brand_shoot_system' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
          OR 'prompt-vault-admin-access' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        )
      LIMIT 1
    `

    if (rows.length === 0) return { valid: false }
    return { valid: true, name: (rows[0].name as string | null) ?? null }
  } catch (error) {
    console.error("[prompt-vault/access] DB error during token validation:", error)
    return { valid: false }
  }
}

export async function hasPaidPromptVaultAccess(token: string | null | undefined): Promise<boolean> {
  return (await getPaidPromptVaultAccess(token)).valid
}
