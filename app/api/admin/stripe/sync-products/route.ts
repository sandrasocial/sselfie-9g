import { NextResponse } from "next/server"
import { syncStripeProducts } from "@/scripts/sync-stripe-products"
import { createServerClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "ssa@ssasocial.com").trim().toLowerCase()

    // Verify admin access
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if ((user.email || "").trim().toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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
