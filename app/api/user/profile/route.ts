import { NextResponse } from "next/server"
import { getCurrentNeonUser } from "@/lib/user-sync"
import { sql } from "@/lib/neon"

export async function GET() {
  try {
    console.log("[v0] Profile API: Fetching user profile")

    const user = await getCurrentNeonUser()

    if (!user) {
      console.log("[v0] Profile API: No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Profile API: User found:", { id: user.id, email: user.email })

    // Fetch user gender from database
    const result = await sql`
      SELECT gender FROM users WHERE id = ${user.id} LIMIT 1
    `

    console.log("[v0] Profile API: Query result:", result)

    if (result.length === 0) {
      console.log("[v0] Profile API: No user data found, returning null gender")
      return NextResponse.json({ gender: null })
    }

    const gender = result[0].gender
    console.log("[v0] Profile API: Returning gender:", gender)

    return NextResponse.json({ gender })
  } catch (error) {
    console.error("[v0] Profile API: Error fetching user profile:", error)
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 })
  }
}
