import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL || "")

export async function POST() {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Decrementing quota for user:", userId)

    // Check if user has unlimited generations
    const usageResult = await sql`
      SELECT monthly_generations_allowed, monthly_generations_used
      FROM user_usage
      WHERE user_id = ${userId}
      LIMIT 1
    `

    if (usageResult.length === 0) {
      return NextResponse.json({ error: "User usage not found" }, { status: 404 })
    }

    const usage = usageResult[0]
    const isUnlimited = usage.monthly_generations_allowed === -1 || usage.monthly_generations_allowed === null

    // Don't decrement if unlimited
    if (isUnlimited) {
      return NextResponse.json({ success: true, isUnlimited: true })
    }

    // Increment the used count
    await sql`
      UPDATE user_usage
      SET 
        monthly_generations_used = monthly_generations_used + 1,
        total_generations_used = total_generations_used + 1,
        last_generation_at = NOW(),
        updated_at = NOW()
      WHERE user_id = ${userId}
    `

    const remaining = Math.max(0, usage.monthly_generations_allowed - (usage.monthly_generations_used + 1))

    return NextResponse.json({
      success: true,
      remaining,
      isUnlimited: false,
    })
  } catch (error) {
    console.error("[v0] Error decrementing quota:", error)
    return NextResponse.json({ error: "Failed to decrement quota" }, { status: 500 })
  }
}
