import { NextResponse } from "next/server"
import { getUserByEmail } from "@/app/actions/landing-checkout"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    console.log("[v0] ==================== USER POLLING API ====================")
    console.log("[v0] Time:", new Date().toISOString())
    console.log("[v0] Email param:", email)

    if (!email) {
      console.log("[v0] ERROR: No email provided")
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("[v0] Calling getUserByEmail...")
    const userInfo = await getUserByEmail(email)

    console.log("[v0] getUserByEmail result:", JSON.stringify(userInfo, null, 2))
    console.log("[v0] Has userInfo:", !!userInfo)

    if (userInfo) {
      console.log("[v0] User details:", {
        email: userInfo.email,
        hasAccount: userInfo.hasAccount,
        productType: userInfo.productType,
        credits: userInfo.credits,
      })
    }

    console.log("[v0] ==================== END POLLING ====================")

    return NextResponse.json({ userInfo })
  } catch (error) {
    console.error("[v0] ==================== ERROR IN POLLING ====================")
    console.error("[v0] Error:", error)
    console.error("[v0] Error stack:", (error as Error).stack)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
