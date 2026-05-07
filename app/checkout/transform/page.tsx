import { redirect } from "next/navigation"
import { startTransformCheckout } from "@/app/actions/transform-checkout"

type TransformCheckoutParams = {
  plan?: string
}

export default async function TransformCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<TransformCheckoutParams>
}) {
  const params = await searchParams
  const plan = params.plan === "topup" ? "topup" : "starter"
  const productType = plan === "topup" ? "transform_topup" : "transform_starter"

  try {
    const clientSecret = await startTransformCheckout(plan)
    if (clientSecret) {
      redirect(
        `/checkout?client_secret=${clientSecret}&product_type=${productType}&return_to=${encodeURIComponent("/transform/studio")}`,
      )
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error
    }
    console.error("[Transform Checkout] Error:", error)
    redirect("/transform?checkout=failed")
  }

  redirect("/transform?checkout=failed")
}
