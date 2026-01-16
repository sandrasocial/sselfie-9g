import Stripe from "stripe"
import { type NextRequest, NextResponse } from "next/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_UNUSED_ENDPOINTS !== "true") return NextResponse.json({ error: "Endpoint disabled" }, { status: 410 })
  try {
    console.log("[v0] Starting Stripe product cleanup...")

    // Products to keep (these have the Price IDs in your env vars)
    const productsToKeep = {
      "SSELFIE STUDIO MEMBERSHIP": "price_1SRH36EVJvME7vkwQO096AFb",
      "SSELFIE ONE TIME SESSION": "price_1SRH7mEVJvME7vkw5vMjZC4s",
      "CREDITS 50": "price_1SRHH3EVJvME7vkwwx9tLXeB",
      "CREDITS 100": "price_1SRHHhEVJvME7vkw4WqYbna5",
      "CREDITS 250": "price_1SRHIJEVJvME7vkwPLhGIcDw",
    }

    // Get all products
    const products = await stripe.products.list({ limit: 100, active: true })
    console.log(`[v0] Found ${products.data.length} active products`)

    const results = {
      kept: [] as string[],
      archived: [] as string[],
      errors: [] as string[],
    }

    for (const product of products.data) {
      await delay(300) // Rate limit protection

      const productName = product.name.toUpperCase()
      const shouldKeep = Object.keys(productsToKeep).includes(productName)

      if (shouldKeep) {
        console.log(`[v0] Keeping product: ${product.name}`)
        results.kept.push(product.name)
      } else {
        // This is a duplicate or old product - archive it
        try {
          console.log(`[v0] Archiving duplicate: ${product.name}`)
          await stripe.products.update(product.id, { active: false })
          results.archived.push(product.name)
        } catch (error: any) {
          console.error(`[v0] Error archiving ${product.name}:`, error.message)
          results.errors.push(`${product.name}: ${error.message}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cleanup completed",
      results,
      recommendation: "Check Stripe Dashboard to verify archived products",
    })
  } catch (error: any) {
    console.error("[v0] Cleanup error:", error)
    return NextResponse.json(
      {
        error: "Cleanup failed",
        message: error.message,
      },
      { status: 500 },
    )
  }
}
