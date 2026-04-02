import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { requireResendClient } from "@/lib/resend/client"
const AUDIENCE_ID = "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd"

interface SyncResult {
  synced: number
  failed: number
  total: number
  errors: Array<{ email: string; error: string }>
}

// Helper to rate limit Resend API calls (max 2 req/sec)
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

async function syncFreebies(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, total: 0, errors: [] }
  const resend = requireResendClient()

  try {
    // Get all freebies not yet synced to Resend
    const missingFreebies = await sql`
      SELECT id, email, name
      FROM freebie_subscribers
      WHERE email IS NOT NULL
        AND LOWER(email) NOT IN (
          SELECT DISTINCT LOWER(email) FROM (
            SELECT email FROM resend_contacts_cache WHERE source = 'freebie_brand_blueprint' LIMIT 1000
          ) rc
        )
      ORDER BY created_at DESC
      LIMIT 500
    `

    result.total = missingFreebies.length
    console.log(`[BATCH-SYNC] Starting freebie sync: ${missingFreebies.length} records`)

    for (const freebie of missingFreebies) {
      try {
        // Add to Resend with freebie-specific tags
        const { data, error } = await resend.contacts.create({
          email: freebie.email,
          firstName: freebie.name?.split(" ")[0] || undefined,
          audienceId: AUDIENCE_ID,
          tags: [
            { name: "source", value: "freebie_brand_blueprint" },
            { name: "status", value: "lead" },
            { name: "product", value: "sselfie-guide" },
          ],
        })

        if (error) {
          result.failed++
          result.errors.push({ email: freebie.email, error: error.message })
          console.error(`[BATCH-SYNC-FREEBIE] Failed ${freebie.email}: ${error.message}`)
          continue
        }

        // Update DB with resend_contact_id
        await sql`
          UPDATE freebie_subscribers
          SET updated_at = NOW()
          WHERE id = ${freebie.id}
        `

        result.synced++
        console.log(`[BATCH-SYNC-FREEBIE] ✓ ${freebie.email} (${result.synced}/${result.total})`)

        // Rate limit: Resend allows ~2 req/sec, be safe with 500ms
        await delay(500)
      } catch (err) {
        result.failed++
        result.errors.push({ email: freebie.email, error: String(err) })
        console.error(`[BATCH-SYNC-FREEBIE] Error ${freebie.email}: ${err}`)
      }
    }
  } catch (error) {
    console.error("[BATCH-SYNC-FREEBIE] Fatal error:", error)
    throw error
  }

  return result
}

async function syncUsers(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, total: 0, errors: [] }
  const resend = requireResendClient()

  try {
    // Get all app users not yet synced to Resend
    const missingUsers = await sql`
      SELECT id, email, first_name, created_at
      FROM users
      WHERE email IS NOT NULL
        AND LOWER(email) NOT IN (
          SELECT DISTINCT LOWER(email) FROM (
            SELECT email FROM resend_contacts_cache WHERE source = 'app_signup' LIMIT 1000
          ) rc
        )
      ORDER BY created_at DESC
      LIMIT 600
    `

    result.total = missingUsers.length
    console.log(`[BATCH-SYNC] Starting user sync: ${missingUsers.length} records`)

    for (const user of missingUsers) {
      try {
        // Add to Resend with app signup tags
        const { data, error } = await resend.contacts.create({
          email: user.email,
          firstName: user.first_name || undefined,
          audienceId: AUDIENCE_ID,
          tags: [
            { name: "source", value: "app_signup" },
            { name: "status", value: "active" },
            { name: "signup_date", value: user.created_at.split("T")[0] },
          ],
        })

        if (error) {
          result.failed++
          result.errors.push({ email: user.email, error: error.message })
          console.error(`[BATCH-SYNC-USER] Failed ${user.email}: ${error.message}`)
          continue
        }

        result.synced++
        console.log(`[BATCH-SYNC-USER] ✓ ${user.email} (${result.synced}/${result.total})`)

        await delay(500)
      } catch (err) {
        result.failed++
        result.errors.push({ email: user.email, error: String(err) })
        console.error(`[BATCH-SYNC-USER] Error ${user.email}: ${err}`)
      }
    }
  } catch (error) {
    console.error("[BATCH-SYNC-USER] Fatal error:", error)
    throw error
  }

  return result
}

async function syncStudioMembers(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, total: 0, errors: [] }
  const resend = requireResendClient()

  try {
    // Get active Studio members not yet synced to Resend
    const missingStudio = await sql`
      SELECT DISTINCT u.id, u.email, u.first_name, s.product_type, s.status
      FROM users u
      JOIN subscriptions s ON u.id = s.user_id
      WHERE s.status = 'active'
        AND u.email IS NOT NULL
        AND LOWER(u.email) NOT IN (
          SELECT DISTINCT LOWER(email) FROM (
            SELECT email FROM resend_contacts_cache WHERE source = 'app_signup' LIMIT 1000
          ) rc
        )
      ORDER BY s.created_at DESC
      LIMIT 100
    `

    result.total = missingStudio.length
    console.log(`[BATCH-SYNC] Starting Studio member sync: ${missingStudio.length} records`)

    for (const member of missingStudio) {
      try {
        const tags: any[] = [
          { name: "source", value: "app_signup" },
          { name: "product", value: "studio_member_active" },
          { name: "subscription_status", value: member.status },
        ]

        if (member.product_type) {
          tags.push({ name: "subscription_product", value: member.product_type })
        }

        const { data, error } = await resend.contacts.create({
          email: member.email,
          firstName: member.first_name || undefined,
          audienceId: AUDIENCE_ID,
          tags,
        })

        if (error) {
          result.failed++
          result.errors.push({ email: member.email, error: error.message })
          console.error(`[BATCH-SYNC-STUDIO] Failed ${member.email}: ${error.message}`)
          continue
        }

        result.synced++
        console.log(`[BATCH-SYNC-STUDIO] ✓ ${member.email} (${result.synced}/${result.total})`)

        await delay(500)
      } catch (err) {
        result.failed++
        result.errors.push({ email: member.email, error: String(err) })
        console.error(`[BATCH-SYNC-STUDIO] Error ${member.email}: ${err}`)
      }
    }
  } catch (error) {
    console.error("[BATCH-SYNC-STUDIO] Fatal error:", error)
    throw error
  }

  return result
}

export async function POST(request: NextRequest) {
  try {
    // Check for admin auth token (basic protection)
    const authHeader = request.headers.get("authorization")
    const adminToken = process.env.ADMIN_API_TOKEN || "dev-only"
    
    if (authHeader !== `Bearer ${adminToken}` && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get sync type from query param
    const url = new URL(request.url)
    const syncType = url.searchParams.get("type") || "all"

    console.log(`[BATCH-SYNC] Starting batch sync for type: ${syncType}`)

    let results: any = {}

    if (syncType === "freebies" || syncType === "all") {
      results.freebies = await syncFreebies()
    }

    if (syncType === "users" || syncType === "all") {
      results.users = await syncUsers()
    }

    if (syncType === "studio" || syncType === "all") {
      results.studio = await syncStudioMembers()
    }

    // Calculate totals
    const totalSynced = Object.values(results).reduce((sum: number, r: any) => sum + r.synced, 0)
    const totalFailed = Object.values(results).reduce((sum: number, r: any) => sum + r.failed, 0)
    const totalAttempted = Object.values(results).reduce((sum: number, r: any) => sum + r.total, 0)

    console.log(`[BATCH-SYNC] COMPLETE: ${totalSynced} synced, ${totalFailed} failed, ${totalAttempted} total`)

    return NextResponse.json({
      success: true,
      summary: {
        totalSynced,
        totalFailed,
        totalAttempted,
        successRate: totalAttempted > 0 ? `${((totalSynced / totalAttempted) * 100).toFixed(1)}%` : "0%",
      },
      details: results,
    })
  } catch (error) {
    console.error("[BATCH-SYNC] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Batch sync failed",
        details: String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Use POST method with ?type=freebies|users|studio|all",
    example: "POST /api/admin/email/batch-sync-missing?type=freebies",
    auth: "Add header: Authorization: Bearer {ADMIN_API_TOKEN}",
  })
}
