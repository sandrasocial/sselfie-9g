"use client"

import Link from "next/link"
import { Suspense } from "react"
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
  "checkout_email",
  "email",
] as const

function buildCheckoutHref(searchParams: { get(name: string): string | null }): string {
  const params = new URLSearchParams()
  for (const key of ATTRIBUTION_KEYS) {
    const value = searchParams.get(key)
    if (value) params.set(key, value)
  }
  if (!params.has("source")) params.set("source", "vault_maya_landing")
  if (!params.has("checkout_source")) params.set("checkout_source", "vault_maya_landing")
  if (!params.has("buyer_stage")) params.set("buyer_stage", "lead")
  const query = params.toString()
  return query ? `/checkout/vault-maya?${query}` : "/checkout/vault-maya"
}

function CheckoutLinkInner({
  label,
  surface,
}: {
  label: string
  surface: "dark" | "cream"
}) {
  const searchParams = useSearchParams()
  const href = buildCheckoutHref(searchParams)
  const dark = surface === "dark"

  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "13px 32px",
        minHeight: "46px",
        background: dark ? "#f5f5f5" : "#0a0a0a",
        color: dark ? "#0a0a0a" : "#f5f5f5",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        textDecoration: "none",
        border: "1px solid transparent",
        boxShadow: dark
          ? "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)"
          : "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.45), 0 1px 5px rgba(0,0,0,0.25)",
        whiteSpace: "normal",
        textAlign: "center",
        lineHeight: 1.35,
        width: "fit-content",
      }}
    >
      {label}
    </Link>
  )
}

export function VaultMayaCheckoutLink({
  label = "Founder price · $19/month",
  surface = "dark",
}: {
  label?: string
  surface?: "dark" | "cream"
}) {
  return (
    <Suspense fallback={null}>
      <CheckoutLinkInner label={label} surface={surface} />
    </Suspense>
  )
}
