import type { Metadata } from "next"

import { getAuthenticatedUser } from "@/lib/auth-helper"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { SelfieToBrandShootSystemShell } from "@/components/selfie-to-brand-shoot/system-shell"

export const metadata: Metadata = {
  title: "Selfie to Brand Shoot System · SSELFIE",
  description: "A lean buyer path for turning one selfie into a usable AI brand shoot.",
  robots: { index: false, follow: false },
}

type TokenResult =
  | { valid: false }
  | { valid: true; name: string | null; token: string }

function getSafeFirstName(name: string | null) {
  if (!name) return null
  if (name.includes("@")) return null

  const first = name.trim().split(/\s+/)[0]
  if (!first || first.length < 2 || first.length > 32) return null

  return first.charAt(0).toUpperCase() + first.slice(1)
}

async function validateToken(token: string): Promise<TokenResult> {
  try {
    const rows = await sql`
      SELECT name
      FROM freebie_subscribers
      WHERE access_token = ${token}
        AND (
          source = 'prompt-vault-paid'
          OR 'prompt-vault-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
          OR 'prompt-vault-admin-access' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        )
      LIMIT 1
    `

    if (rows.length === 0) return { valid: false }

    return {
      valid: true,
      name: (rows[0].name as string | null) ?? null,
      token,
    }
  } catch (error) {
    console.error("[selfie-to-brand-shoot/access] token validation failed:", error)
    return { valid: false }
  }
}

async function isCurrentUserAdmin() {
  const { user } = await getAuthenticatedUser()
  return isAdminEmail(user?.email)
}

function InvalidAccess() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 22px",
        background: "#F8FAFA",
        color: "#0D0E10",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <p
          style={{
            margin: "0 0 18px",
            color: "#818283",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
          }}
        >
          SSELFIE
        </p>
        <h1
          style={{
            margin: "0 0 14px",
            fontSize: "clamp(2.6rem, 11vw, 4rem)",
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          This system link does not look right.
        </h1>
        <p style={{ margin: "0 0 28px", color: "#4F5052", lineHeight: 1.8 }}>
          Open the link from your Vault email, or email support and we will help you get back in.
        </p>
        <a
          href="mailto:support@sselfie.ai?subject=Selfie%20to%20Brand%20Shoot%20access"
          style={{
            minHeight: 46,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px 22px",
            background: "#0D0E10",
            color: "#F8FAFA",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textDecoration: "none",
            textTransform: "uppercase",
          }}
        >
          Email Support
        </a>
      </div>
    </main>
  )
}

export default async function SelfieToBrandShootTokenAccessPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await validateToken(token)
  const adminOverride = !result.valid ? await isCurrentUserAdmin() : false

  if (!result.valid && !adminOverride) {
    return <InvalidAccess />
  }

  logAnalyticsEvent({
    eventName: "academy_home_opened",
    path: "/access/selfie-to-brand-shoot/[token]",
    properties: {
      product_id: "selfie_to_brand_shoot_shell",
      source: "prompt-vault-token",
      access_mode: result.valid ? "token" : "admin_override",
      token_prefix: token.slice(0, 8),
    },
  }).catch(() => {})

  return (
    <SelfieToBrandShootSystemShell
      firstName={result.valid ? getSafeFirstName(result.name) : null}
      vaultHref={
        result.valid
          ? `/access/prompt-vault/${encodeURIComponent(token)}`
          : "/academy/access/prompt-vault"
      }
      accessMode="token"
      hasPromptVaultAccess={result.valid}
    />
  )
}
