import { redirect } from "next/navigation"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { createServerClient } from "@/lib/supabase/server"
import {
  buildCheckoutRedirectUrl,
  getCheckoutAttributionFromParams,
} from "@/lib/revenue-engine/checkout-attribution"
import Link from "next/link"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { getSuiteAccess } from "@/lib/trial/suite-trial"

export const dynamic = "force-dynamic"

function normalizeCheckoutEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export default async function VaultMayaCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    promo?: string
    source?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    campaign_id?: string
    ref?: string
    referral_code?: string
    checkout_source?: string
    cta_keyword?: string
    entry_path?: string
    entry_post_slug?: string
    buyer_stage?: string
    checkout_email?: string
    email?: string
    returnTo?: string
    return_to?: string
  }>
}) {
  const params = await searchParams
  const attribution = getCheckoutAttributionFromParams(params, {
    source: "vault_maya_checkout_page",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const urlEmail = normalizeCheckoutEmail(params.checkout_email || params.email)
  const checkoutEmail = authUser?.email ?? urlEmail ?? null
  const productId = "vault_maya"

  // B3 (Sandra, 2026-07-30): active SUITE members must not pay again for a subset they
  // already have. Signed-in members see the included message instead of a payment form.
  // Known limitation: an anonymous checkout with a different email cannot be blocked.
  if (authUser?.id) {
    try {
      const neonUserId = await getUserIdFromSupabase(authUser.id)
      if (neonUserId) {
        const access = await getSuiteAccess(String(neonUserId))
        if (access.level === "member") {
          return (
            <main className="flex min-h-screen items-center justify-center bg-[#F8FAFA] px-5">
              <div className="max-w-md rounded-lg border border-neutral-200 bg-white p-8 text-center">
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                  Vault Maya
                </p>
                <h1 className="mt-3 font-serif text-3xl font-light leading-tight text-neutral-950">
                  You already have this.
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
                  Vault Maya is included in your SSELFIE SUITE membership — every Vault look,
                  ready to create, no extra charge.
                </p>
                <Link
                  href="/vault-maya/studio"
                  className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-neutral-950 px-7 text-xs uppercase tracking-[0.16em] text-white"
                >
                  Open Vault Maya
                </Link>
              </div>
            </main>
          )
        }
      }
    } catch (error) {
      console.error("[checkout/vault-maya] member guard check failed:", error)
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#F8FAFA] px-5">
          <div className="max-w-md rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
              Vault Maya
            </p>
            <h1 className="mt-3 font-serif text-3xl font-light leading-tight text-neutral-950">
              We couldn&apos;t confirm your access.
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
              Refresh and try again before paying. If you already have the SUITE, Vault Maya is
              included and you can open it from your studio.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <Link
                href="/checkout/vault-maya"
                className="inline-flex min-h-11 items-center rounded-sm bg-neutral-950 px-7 text-xs uppercase tracking-[0.16em] text-white"
              >
                Try again
              </Link>
              <Link
                href="/vault-maya/studio"
                className="text-xs text-neutral-600 underline underline-offset-4"
              >
                Open my studio
              </Link>
            </div>
          </div>
        </main>
      )
    }
  }

  try {
    const clientSecret = await createLandingCheckoutSession(productId, params.promo, checkoutEmail, {
      ...attribution,
    })
    if (clientSecret) {
      redirect(buildCheckoutRedirectUrl(clientSecret, productId, { ...params }))
    }
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error
    }
    console.error("[checkout/vault-maya] Error creating session:", error)
  }
  redirect("/checkout/failure?product=" + productId)
}
