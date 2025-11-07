import { NextResponse } from "next/server"
import { getUserByEmail } from "@/app/actions/landing-checkout"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("[v0] Polling for user with email:", email)

    const userInfo = await getUserByEmail(email)

    console.log("[v0] User polling result:", userInfo ? "found" : "not found")

    return NextResponse.json({ userInfo })
  } catch (error) {
    console.error("[v0] Error in user-by-email API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
