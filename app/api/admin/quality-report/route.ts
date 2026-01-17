/**
 * ADMIN API: QUALITY REPORT
 * Phase 2C-4-3: Admin-only endpoint for viewing quality metrics
 * 
 * Purpose: Allow founder/admin to view quality reports
 * - Weekly summaries
 * - Quality trends
 * - Simple verdict
 * 
 * CRITICAL: Admin-only access
 * - Requires admin authentication
 * - Internal use only
 * - Not user-facing
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import {
  getQualitySummary,
  detectQualityTrends,
  getQualityVerdict,
  formatSummaryForConsole,
  formatTrendsForConsole,
} from "@/lib/quality/reporting"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Check if user is admin
 */
async function checkAdminAccess(): Promise<boolean> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return false
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return false
    }

    // Check if user is admin by email
    if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * GET /api/admin/quality-report
 * 
 * Query params:
 * - format: 'json' | 'text' (default: 'json')
 * - days: number of days to look back (default: 7)
 * - action: 'summary' | 'trends' | 'verdict' | 'full' (default: 'full')
 */
export async function GET(request: Request) {
  try {
    // Check admin access
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "json"
    const days = parseInt(searchParams.get("days") || "7")
    const action = searchParams.get("action") || "full"

    console.log(`[ADMIN-QUALITY-REPORT] Generating report: action=${action}, days=${days}, format=${format}`)

    // Get summary
    if (action === "summary" || action === "full") {
      const summary = await getQualitySummary(days)
      
      if (!summary) {
        return NextResponse.json({
          error: "No quality data available for the specified period",
          days,
        }, { status: 404 })
      }

      if (format === "text") {
        const text = formatSummaryForConsole(summary)
        return new NextResponse(text, {
          headers: { "Content-Type": "text/plain" },
        })
      }

      if (action === "summary") {
        return NextResponse.json({ summary })
      }
    }

    // Get trends
    if (action === "trends" || action === "full") {
      const trends = await detectQualityTrends(days, days)

      if (format === "text") {
        const text = formatTrendsForConsole(trends)
        return new NextResponse(text, {
          headers: { "Content-Type": "text/plain" },
        })
      }

      if (action === "trends") {
        return NextResponse.json({ trends })
      }
    }

    // Get verdict
    if (action === "verdict" || action === "full") {
      const verdict = await getQualityVerdict()

      if (action === "verdict") {
        return NextResponse.json({ verdict })
      }
    }

    // Full report (default)
    const summary = await getQualitySummary(days)
    const trends = await detectQualityTrends(days, days)
    const verdict = await getQualityVerdict()

    if (!summary) {
      return NextResponse.json({
        error: "No quality data available",
        verdict,
      }, { status: 404 })
    }

    if (format === "text") {
      const summaryText = formatSummaryForConsole(summary)
      const trendsText = formatTrendsForConsole(trends)
      const verdictText = `\n\nOVERALL VERDICT: ${verdict.verdict.toUpperCase()}\nConfidence: ${verdict.confidence}\nSummary: ${verdict.summary}\n`
      
      return new NextResponse(summaryText + "\n" + trendsText + verdictText, {
        headers: { "Content-Type": "text/plain" },
      })
    }

    return NextResponse.json({
      summary,
      trends,
      verdict,
    })
  } catch (error) {
    console.error("[ADMIN-QUALITY-REPORT] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * USAGE EXAMPLES:
 * 
 * Get full JSON report:
 * GET /api/admin/quality-report
 * 
 * Get text-formatted summary:
 * GET /api/admin/quality-report?format=text
 * 
 * Get last 30 days:
 * GET /api/admin/quality-report?days=30
 * 
 * Get just verdict:
 * GET /api/admin/quality-report?action=verdict
 * 
 * Get trends only:
 * GET /api/admin/quality-report?action=trends
 */
