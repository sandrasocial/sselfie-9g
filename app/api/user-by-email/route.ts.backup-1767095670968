import { NextResponse } from "next/server"
import { getUserByEmail } from "@/app/actions/landing-checkout"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const userInfo = await getUserByEmail(email)

    console.log("[v0] User polling for:", email, "hasAccount:", userInfo?.hasAccount)

    return NextResponse.json({ userInfo })
  } catch (error) {
    console.error("[v0] User polling error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
