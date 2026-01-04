import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'platform' // 'platform' or 'user'
    const userId = searchParams.get('userId')

    console.log('[v0] Fetching Instagram analytics, scope:', scope)

    if (scope === 'user' && !userId) {
      return NextResponse.json({ error: 'userId required for user scope' }, { status: 400 })
    }

    if (scope === 'platform') {
      // Fetch platform-wide aggregated metrics
      const platformMetrics = await sql`
        SELECT * FROM instagram_platform_metrics
        ORDER BY metric_date DESC
        LIMIT 30
      `

      const totalConnections = await sql`
        SELECT COUNT(*) as total FROM instagram_connections
        WHERE is_active = true
      `

      const recentInsights = await sql`
        SELECT 
          ii.metric_type,
          SUM(ii.value) as total_value,
          DATE(ii.insight_date) as date
        FROM instagram_insights ii
        JOIN instagram_connections ic ON ii.connection_id = ic.id
        WHERE ii.insight_date >= NOW() - INTERVAL '30 days'
        GROUP BY ii.metric_type, DATE(ii.insight_date)
        ORDER BY date DESC
      `

      return NextResponse.json({
        platformMetrics: platformMetrics[0] || null,
        totalConnections: parseInt(totalConnections[0]?.total || '0'),
        recentInsights: recentInsights,
        historicalData: platformMetrics,
      })
    } else {
      // Fetch user-specific metrics
      const userConnection = await sql`
        SELECT * FROM instagram_connections
        WHERE user_id = ${userId} AND is_active = true
        LIMIT 1
      `

      if (userConnection.length === 0) {
        return NextResponse.json({ error: 'No Instagram connection found', connected: false }, { status: 404 })
      }

      const connection = userConnection[0]

      const userInsights = await sql`
        SELECT * FROM instagram_insights
        WHERE connection_id = ${connection.id}
        AND insight_date >= NOW() - INTERVAL '30 days'
        ORDER BY insight_date DESC
      `

      const userPosts = await sql`
        SELECT * FROM instagram_posts
        WHERE connection_id = ${connection.id}
        ORDER BY posted_at DESC
        LIMIT 10
      `

      return NextResponse.json({
        connection,
        insights: userInsights,
        recentPosts: userPosts,
        connected: true,
      })
    }
  } catch (error) {
    console.error('[Instagram Analytics Error]:', error)
    return NextResponse.json({ error: 'Failed to fetch Instagram analytics' }, { status: 500 })
  }
}
