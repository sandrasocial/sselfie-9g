import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { startProductCheckoutSession } from "@/app/actions/stripe"
import { createServerClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Checkout | Selfie Guide",
  description: "Complete your Selfie Guide purchase with one direct checkout path.",
}

export default async function SelfieGuideCheckoutPage() {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  try {
    const clientSecret = authUser
      ? await startProductCheckoutSession("selfie_guide", undefined, {
          source: "selfie_guide_paid",
        })
      : await createLandingCheckoutSession("selfie_guide", undefined, null, {
          source: "selfie_guide_paid",
        })

    if (clientSecret) {
      redirect(`/checkout?client_secret=${clientSecret}&product_type=selfie_guide`)
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }

    console.error("[Selfie Guide Checkout] Error creating checkout session:", error)
  }

  redirect("/selfie-guide?checkout=failed")
}
