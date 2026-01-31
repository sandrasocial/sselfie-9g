import { NextResponse } from "next/server"
import { syncStripeProducts } from "@/scripts/sync-stripe-products"
import { createServerClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    // Verify admin access
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin (you can add your own admin check logic here)
    // For now, we'll just check if they're authenticated

    // Sync products
    await syncStripeProducts()

    return NextResponse.json({
      success: true,
      message: "Stripe products synced successfully. Check server logs for Price IDs.",
    })
  } catch (error) {
    console.error("Error syncing Stripe products:", error)
    return NextResponse.json({ error: "Failed to sync Stripe products" }, { status: 500 })
  }
}
