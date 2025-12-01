/**
 * Get Email Sequence Status for All Users
 * Admin endpoint to view sequence progress
 */

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { neon } from "@neondatabase/serverless"
import { getSequenceStatus } from "@/lib/data/email-sequence"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    // Require admin access
    const guard = await requireAdmin(request)
    if (guard instanceof NextResponse) {
      return guard
    }

    // Get all users and subscribers
    const users = await sql`
      SELECT id, email FROM users WHERE email IS NOT NULL
    `

    const subscribers = await sql`
      SELECT email, user_id FROM marketing_subscribers
    `

    // Combine and deduplicate
    const allEmails = new Map<string, string | null>()

    for (const user of users) {
      allEmails.set(user.email, user.id)
    }

    for (const sub of subscribers) {
      if (!allEmails.has(sub.email)) {
        allEmails.set(sub.email, sub.user_id)
      }
    }

    // Get status for each
    const statuses = await Promise.all(
      Array.from(allEmails.entries()).map(async ([email, userId]) => {
        const status = await getSequenceStatus(userId, email)
        return {
          ...status,
          lastEmailSentAt: status.lastEmailSentAt?.toISOString() || null,
          nextEmailDueAt: status.nextEmailDueAt?.toISOString() || null,
        }
      }),
    )

    // Sort by email
    statuses.sort((a, b) => a.email.localeCompare(b.email))

    return NextResponse.json({
      success: true,
      statuses,
      total: statuses.length,
    })
  } catch (error) {
    console.error("[EmailSequenceStatus] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

