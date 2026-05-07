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
    console.error("[Transform Checkout] Error creating session:", error)
    redirect("/transform?checkout=error")
  }

  if (!clientSecret) {
    redirect("/transform?checkout=error")
  }

  redirect(
    `/checkout?client_secret=${clientSecret}&product_type=${productType}&return_to=${encodeURIComponent("/transform/studio")}`,
  )
}
