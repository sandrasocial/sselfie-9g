import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Sync Instagram insights for all active connections
export async function POST(request: NextRequest) {
  try {
    console.log('[v0] Starting Instagram insights sync')

    // Get all active Instagram connections
    const connections = await sql`
      SELECT * FROM instagram_connections
      WHERE is_active = true AND token_expires_at > NOW()
    `

    console.log(`[v0] Found ${connections.length} active Instagram connections`)

    let successCount = 0
    let errorCount = 0

    for (const connection of connections) {
      try {
        // Fetch insights from Instagram Graph API
        const today = new Date().toISOString().split('T')[0]
        const metricsToFetch = ['impressions', 'reach', 'profile_views', 'follower_count']

        for (const metric of metricsToFetch) {
          const insightsResponse = await fetch(
            `https://graph.instagram.com/${connection.instagram_user_id}/insights?metric=${metric}&period=day&access_token=${connection.access_token}`
          )

          const insightsData = await insightsResponse.json()

          if (insightsData.data && insightsData.data.length > 0) {
            const value = insightsData.data[0].values[0]?.value || 0

            // Store in database
            await sql`
              INSERT INTO instagram_insights (connection_id, user_id, insight_date, metric_type, value)
              VALUES (${connection.id}, ${connection.user_id}, ${today}, ${metric}, ${value})
              ON CONFLICT (connection_id, insight_date, metric_type)
              DO UPDATE SET value = ${value}
            `
          }
        }

        // Update last_synced_at
        await sql`
          UPDATE instagram_connections
          SET last_synced_at = NOW()
          WHERE id = ${connection.id}
        `

        successCount++
        console.log(`[v0] Synced insights for @${connection.instagram_username}`)
      } catch (error) {
        errorCount++
        console.error(`[v0] Error syncing @${connection.instagram_username}:`, error)
      }
    }

    console.log(`[v0] Instagram sync complete: ${successCount} success, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      synced: successCount,
      errors: errorCount,
      message: `Synced ${successCount} Instagram accounts`,
    })
  } catch (error) {
    console.error('[Instagram Sync Error]:', error)
    return NextResponse.json({ error: 'Failed to sync Instagram insights' }, { status: 500 })
  }
}
