"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

const ATTRIBUTION_KEYS = [
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "email_type",
  "campaign_id",
  "ref",
  "referral_code",
  "checkout_source",
  "freebie_source",
  "guide_cta",
  "cta_keyword",
  "quiz_result",
  "return_to",
  "entry_path",
  "entry_post_slug",
  "buyer_stage",
] as const

function buildCheckoutHref(searchParams: { get(name: string): string | null }): string {
  const params = new URLSearchParams()

  for (const key of ATTRIBUTION_KEYS) {
    const value = searchParams.get(key)
    if (value) {
      params.set(key, value)
    }
  }

  if (!params.has("source")) {
    params.set("source", "prompt_vault_landing")
  }
  if (!params.has("checkout_source")) {
    params.set("checkout_source", "prompt_vault_landing")
  }
  if (!params.has("buyer_stage")) {
    params.set("buyer_stage", "lead")
  }

  const query = params.toString()
  return query ? `/checkout/prompt-vault?${query}` : "/checkout/prompt-vault"
}

export function PromptVaultCheckoutLink({ label = "Get the Vault · $27" }: { label?: string }) {
  const searchParams = useSearchParams()
  const href = buildCheckoutHref(searchParams)

  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "13px 32px",
        minHeight: "46px",
        background: "#f5f5f5",
        color: "#0a0a0a",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        textDecoration: "none",
        border: "1px solid transparent",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
        whiteSpace: "normal",
        textAlign: "center",
        lineHeight: 1.35,
      }}
    >
      {label}
    </Link>
  )
}
