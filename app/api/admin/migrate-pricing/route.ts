import { NextResponse } from "next/server"
import { migrateUsersToNewPricing } from "@/scripts/migrate-to-new-pricing"

/**
 * Admin API endpoint to trigger pricing migration
 * POST /api/admin/migrate-pricing
 *
 * This should be called once during deployment to migrate
 * all existing users to the new pricing model.
 */
export async function POST(request: Request) {
  try {
    // TODO: Add admin authentication check here
    // const isAdmin = await checkAdminAuth(request)
    // if (!isAdmin) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    console.log("[v0] Admin triggered pricing migration")

    const result = await migrateUsersToNewPricing()

    return NextResponse.json({
      success: true,
      message: "Pricing migration completed successfully",
      ...result,
    })
  } catch (error: any) {
    console.error("[v0] Migration API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return NextResponse.json({
    message: "Use POST to trigger migration",
    endpoint: "/api/admin/migrate-pricing",
  })
}
