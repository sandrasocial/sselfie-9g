import { NextResponse } from "next/server"

import { resolveAcademyNewSalePolicy } from "@/lib/academy-new-sale-policy"

type CheckoutRequestBody = {
  productId?: unknown
}

export async function POST(request: Request) {
  let body: CheckoutRequestBody
  try {
    body = (await request.json()) as CheckoutRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid productId" }, { status: 400 })
  }

  const salePolicy = resolveAcademyNewSalePolicy(body.productId)
  if (salePolicy.status === "dedicated_checkout_only") {
    return NextResponse.json(
      {
        error: "This product uses a dedicated checkout flow.",
        purchaseUrl: salePolicy.purchaseUrl,
      },
      { status: 400 }
    )
  }
  return NextResponse.json({ error: "Invalid productId" }, { status: 400 })
}
