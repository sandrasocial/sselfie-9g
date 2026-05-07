import { redirect } from "next/navigation"
import { startTransformCheckout } from "@/app/actions/transform-checkout"

type TransformCheckoutParams = {
  plan?: string
}

export const dynamic = "force-dynamic"

export default async function TransformCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<TransformCheckoutParams>
}) {
  const params = await searchParams
  const plan = params.plan === "topup" ? "topup" : "starter"
  const productType = plan === "topup" ? "transform_topup" : "transform_starter"

  let clientSecret: string | null = null

  try {
    clientSecret = await startTransformCheckout(plan)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Transform Checkout] Error creating session:", msg)
    redirect(`/transform?checkout=error&reason=${encodeURIComponent(msg)}`)
  }

  if (!clientSecret) {
    redirect("/transform?checkout=error&reason=no_client_secret")
  }

  redirect(
    `/checkout?client_secret=${clientSecret}&product_type=${productType}&return_to=${encodeURIComponent("/transform/studio")}`,
  )
}
