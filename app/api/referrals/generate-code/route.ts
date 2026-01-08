import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/referrals/generate-code
 * 
 * Generates and saves a unique referral code for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user already has a referral code
    const existingCode = await sql`
      SELECT referral_code FROM users WHERE id = ${neonUser.id} AND referral_code IS NOT NULL LIMIT 1
    `

    if (existingCode.length > 0 && existingCode[0].referral_code) {
      return NextResponse.json({
        success: true,
        referralCode: existingCode[0].referral_code,
        referralLink: `${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/?ref=${existingCode[0].referral_code}`,
      })
    }

    // Generate unique referral code
    // Format: First 3 letters of email + random 6-digit number
    const emailPrefix = neonUser.email?.split("@")[0].toUpperCase().slice(0, 3) || "SSE"
    let referralCode: string
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      const randomNum = Math.floor(100000 + Math.random() * 900000) // 6-digit number
      referralCode = `${emailPrefix}${randomNum}`

      const existing = await sql`
        SELECT id FROM referrals WHERE referral_code = ${referralCode} LIMIT 1
      `

      if (existing.length === 0) {
        isUnique = true
      } else {
        attempts++
      }
    }

    if (!isUnique) {
      // Fallback: use UUID-based code
      const { randomUUID } = await import("crypto")
      const uuid = randomUUID().replace(/-/g, "").toUpperCase().slice(0, 12)
      referralCode = `REF${uuid}`
    }

    // Save referral code to users table
    await sql`
      UPDATE users 
      SET referral_code = ${referralCode}
      WHERE id = ${neonUser.id}
    `

    const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/?ref=${referralCode}`

    console.log(`[v0] ✅ Generated referral code for user ${neonUser.id}: ${referralCode}`)

    return NextResponse.json({
      success: true,
      referralCode,
      referralLink,
    })
  } catch (error) {
    console.error("[v0] Error generating referral code:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate referral code" },
      { status: 500 },
    )
  }
}
