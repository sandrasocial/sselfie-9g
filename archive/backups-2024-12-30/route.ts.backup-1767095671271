import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getUserId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET() {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching quota for user:", userId)

    // Check user's plan and usage from user_usage table
    const usageResult = await sql`
      SELECT 
        monthly_generations_allowed,
        monthly_generations_used,
        plan
      FROM user_usage
      WHERE user_id = ${userId}
      LIMIT 1
    `

    if (usageResult.length === 0) {
      // User doesn't have usage record yet, create one with default values
      await sql`
        INSERT INTO user_usage (
          user_id,
          monthly_generations_allowed,
          monthly_generations_used,
          plan,
          current_period_start,
          current_period_end,
          created_at,
          updated_at
        ) VALUES (
          ${userId},
          100,
          0,
          'free',
          NOW(),
          NOW() + INTERVAL '1 month',
          NOW(),
          NOW()
        )
      `

      return NextResponse.json({
        remaining: 100,
        total: 100,
        used: 0,
        isUnlimited: false,
        plan: "free",
      })
    }

    const usage = usageResult[0]
    const isUnlimited = usage.monthly_generations_allowed === -1 || usage.monthly_generations_allowed === null

    if (isUnlimited) {
      return NextResponse.json({
        isUnlimited: true,
        plan: usage.plan,
      })
    }

    const remaining = Math.max(0, usage.monthly_generations_allowed - usage.monthly_generations_used)

    return NextResponse.json({
      remaining,
      total: usage.monthly_generations_allowed,
      used: usage.monthly_generations_used,
      isUnlimited: false,
      plan: usage.plan,
    })
  } catch (error) {
    console.error("[v0] Error fetching quota:", error)
    return NextResponse.json({ error: "Failed to fetch quota" }, { status: 500 })
  }
}
