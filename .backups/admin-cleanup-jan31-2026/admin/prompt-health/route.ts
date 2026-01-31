import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { evaluateAlertRules, type Alert } from "@/lib/maya/prompt-health-alerts"
import { recordIncidentEvent, hasRecentIncident } from "@/lib/maya/incident-recorder"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export const dynamic = "force-dynamic"

interface PromptAuditEvent {
  id: string
  created_at: string
  route_id: string
  route_path: string | null
  prompt_type: string | null
  fingerprint: string
  provider: string | null
  model: string | null
  status: string
  error_code: string | null
  user_id: string | null
  mode: string | null
  feature: string | null
  builder: string | null
  execution_time_ms: number | null
  prompt_length: number | null
}

interface DriftInfo {
  route_id: string
  current_fingerprint: string
  previous_fingerprint: string | null
  changed_at: string | null
}

export async function GET(req: Request) {
  try {
    // Authenticate admin
    const { user: authUser } = await getAuthenticatedUser()
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = getDb()
    const { searchParams } = new URL(req.url)
    const routeId = searchParams.get("routeId")
    const status = searchParams.get("status")
    const timeRange = searchParams.get("timeRange") || "24h"

    // Calculate time range
    const timeWindowHours = timeRange === "7d" ? 168 : timeRange === "30d" ? 720 : 24
    const timeInterval = timeRange === "7d" ? "7 days" : timeRange === "30d" ? "30 days" : "24 hours"

    // Get summary stats
    const [summaryStats] = await sql`
      SELECT 
        COUNT(*) as events_last_24h,
        COUNT(*) FILTER (WHERE status = 'error') as errors_last_24h,
        COUNT(DISTINCT fingerprint) as unique_fingerprints_last_24h
      FROM prompt_audit_events
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `

    // Get top routes by volume
    const topRoutes = await sql`
      SELECT 
        route_id,
        COUNT(*) as volume
      FROM prompt_audit_events
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY route_id
      ORDER BY volume DESC
      LIMIT 5
    `

    // Get recent events with filters
    let events
    if (routeId && status) {
      events = await sql`
        SELECT 
          id,
          created_at,
          route_id,
          route_path,
          prompt_type,
          fingerprint,
          provider,
          model,
          status,
          error_code,
          user_id,
          mode,
          feature,
          builder,
          execution_time_ms,
          prompt_length
        FROM prompt_audit_events
        WHERE created_at >= NOW() - INTERVAL ${timeRange === "7d" ? "7 days" : timeRange === "30d" ? "30 days" : "24 hours"}
          AND route_id = ${routeId}
          AND status = ${status}
        ORDER BY created_at DESC
        LIMIT 200
      `
    } else if (routeId) {
      events = await sql`
        SELECT 
          id,
          created_at,
          route_id,
          route_path,
          prompt_type,
          fingerprint,
          provider,
          model,
          status,
          error_code,
          user_id,
          mode,
          feature,
          builder,
          execution_time_ms,
          prompt_length
        FROM prompt_audit_events
        WHERE created_at >= NOW() - INTERVAL ${timeRange === "7d" ? "7 days" : timeRange === "30d" ? "30 days" : "24 hours"}
          AND route_id = ${routeId}
        ORDER BY created_at DESC
        LIMIT 200
      `
    } else if (status) {
      events = await sql`
        SELECT 
          id,
          created_at,
          route_id,
          route_path,
          prompt_type,
          fingerprint,
          provider,
          model,
          status,
          error_code,
          user_id,
          mode,
          feature,
          builder,
          execution_time_ms,
          prompt_length
        FROM prompt_audit_events
        WHERE created_at >= NOW() - INTERVAL ${timeRange === "7d" ? "7 days" : timeRange === "30d" ? "30 days" : "24 hours"}
          AND status = ${status}
        ORDER BY created_at DESC
        LIMIT 200
      `
    } else {
      events = await sql`
        SELECT 
          id,
          created_at,
          route_id,
          route_path,
          prompt_type,
          fingerprint,
          provider,
          model,
          status,
          error_code,
          user_id,
          mode,
          feature,
          builder,
          execution_time_ms,
          prompt_length
        FROM prompt_audit_events
        WHERE created_at >= NOW() - INTERVAL ${timeRange === "7d" ? "7 days" : timeRange === "30d" ? "30 days" : "24 hours"}
        ORDER BY created_at DESC
        LIMIT 200
      `
    }

    // Get totals by status for selected time window
    const totalsByStatus = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM prompt_audit_events
      WHERE created_at >= NOW() - INTERVAL ${timeInterval}
      GROUP BY status
    `

    // Get totals by route (top 10)
    const totalsByRoute = await sql`
      SELECT 
        route_id,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'error') as errors
      FROM prompt_audit_events
      WHERE created_at >= NOW() - INTERVAL ${timeInterval}
      GROUP BY route_id
      ORDER BY total DESC
      LIMIT 10
    `

    // Get error rate by route (min 10 events threshold)
    const errorRateByRoute = await sql`
      SELECT 
        route_id,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'error') as errors,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'error') / COUNT(*), 2) as error_rate
      FROM prompt_audit_events
      WHERE created_at >= NOW() - INTERVAL ${timeInterval}
      GROUP BY route_id
      HAVING COUNT(*) >= 10
      ORDER BY error_rate DESC
      LIMIT 10
    `

    // Get provider/model errors
    const providerErrors = await sql`
      SELECT 
        provider,
        model,
        COUNT(*) as error_count
      FROM prompt_audit_events
      WHERE created_at >= NOW() - INTERVAL ${timeInterval}
        AND status = 'error'
        AND (provider IS NOT NULL OR model IS NOT NULL)
      GROUP BY provider, model
      ORDER BY error_count DESC
      LIMIT 20
    `

    // Get drift events (fingerprint changes per route in time window)
    const driftEventsData = await sql`
      WITH route_fingerprints AS (
        SELECT 
          route_id,
          fingerprint,
          created_at,
          LAG(fingerprint) OVER (PARTITION BY route_id ORDER BY created_at) as previous_fingerprint,
          LAG(created_at) OVER (PARTITION BY route_id ORDER BY created_at) as previous_created_at
        FROM prompt_audit_events
        WHERE created_at >= NOW() - INTERVAL ${timeInterval}
      ),
      fingerprint_changes AS (
        SELECT 
          route_id,
          fingerprint as current_fingerprint,
          previous_fingerprint,
          created_at as changed_at
        FROM route_fingerprints
        WHERE fingerprint != COALESCE(previous_fingerprint, '')
      )
      SELECT 
        route_id,
        COUNT(*) as change_count,
        MAX(changed_at) as last_changed_at
      FROM fingerprint_changes
      GROUP BY route_id
      ORDER BY change_count DESC
    `

    // Get drift detection data (current vs previous fingerprint per route)
    const driftData = await sql`
      WITH ranked_events AS (
        SELECT 
          route_id,
          fingerprint,
          created_at,
          ROW_NUMBER() OVER (PARTITION BY route_id ORDER BY created_at DESC) as rn
        FROM prompt_audit_events
        WHERE created_at >= NOW() - INTERVAL '7 days'
      ),
      current_fingerprints AS (
        SELECT route_id, fingerprint, created_at
        FROM ranked_events
        WHERE rn = 1
      ),
      previous_fingerprints AS (
        SELECT route_id, fingerprint, created_at
        FROM ranked_events
        WHERE rn = 2
      )
      SELECT 
        c.route_id,
        c.fingerprint as current_fingerprint,
        p.fingerprint as previous_fingerprint,
        c.created_at as changed_at
      FROM current_fingerprints c
      LEFT JOIN previous_fingerprints p ON c.route_id = p.route_id
      WHERE c.fingerprint != COALESCE(p.fingerprint, '')
      ORDER BY c.route_id
    `

    // Prepare data for alert evaluation
    const routeStats = totalsByRoute.map((r: any) => ({
      routeId: r.route_id,
      total: Number(r.total),
      errors: Number(r.errors),
      errorRate: Number(r.total) > 0 ? (Number(r.errors) / Number(r.total)) * 100 : 0,
    }))

    const providerErrorStats = providerErrors.map((p: any) => ({
      provider: p.provider,
      model: p.model,
      errorCount: Number(p.error_count),
    }))

    const driftEvents = driftEventsData.map((d: any) => ({
      routeId: d.route_id,
      changeCount: Number(d.change_count),
      lastChangedAt: d.last_changed_at,
    }))

    // Evaluate alert rules
    const alerts = evaluateAlertRules(routeStats, providerErrorStats, driftEvents, timeWindowHours)
    
    // Phase 6A: Auto-create incidents from RED alerts (with deduplication)
    const redAlerts = alerts.filter(a => a.severity === 'red')
    for (const alert of redAlerts) {
      // Create dedupe key from route/provider/fingerprint
      const routeId = alert.routeId || 'unknown'
      const provider = alert.metricSnapshot?.provider || alert.metricSnapshot?.model || 'unknown'
      const fingerprint = alert.metricSnapshot?.fingerprint || alert.metricSnapshot?.currentFingerprint || 'unknown'
      const dedupeKey = `${routeId}|${provider}|${fingerprint}`
      
      // Check if similar incident was created recently (within 60 minutes)
      const hasRecent = await hasRecentIncident(dedupeKey, 60)
      
      if (!hasRecent) {
        // Record incident (non-blocking)
        await recordIncidentEvent({
          severity: alert.severity,
          title: alert.title,
          detail: alert.detail,
          snapshot: {
            dedupeKey,
            routeId: alert.routeId,
            ...alert.metricSnapshot,
            generatedAt: new Date().toISOString(),
          },
          dedupeKey,
        })
      }
    }
    
    // Get recent incidents
    const recentIncidents = await sql`
      SELECT 
        id,
        created_at,
        severity,
        title,
        detail,
        snapshot,
        resolved_at,
        resolution_note
      FROM incident_events
      ORDER BY created_at DESC
      LIMIT 20
    `
    
    // Get safe mode status
    const safeModeEnabled = process.env.SAFE_MODE === 'true'

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary: {
        eventsLast24h: Number(summaryStats?.events_last_24h || 0),
        errorsLast24h: Number(summaryStats?.errors_last_24h || 0),
        uniqueFingerprintsLast24h: Number(summaryStats?.unique_fingerprints_last_24h || 0),
        topRoutes: topRoutes.map((r: any) => ({
          routeId: r.route_id,
          volume: Number(r.volume),
        })),
      },
      totalsByStatus: totalsByStatus.map((t: any) => ({
        status: t.status,
        count: Number(t.count),
      })),
      totalsByRoute: totalsByRoute.map((r: any) => ({
        routeId: r.route_id,
        total: Number(r.total),
        errors: Number(r.errors),
        errorRate: Number(r.total) > 0 ? (Number(r.errors) / Number(r.total)) * 100 : 0,
      })),
      errorRateByRoute: errorRateByRoute.map((r: any) => ({
        routeId: r.route_id,
        total: Number(r.total),
        errors: Number(r.errors),
        errorRate: Number(r.error_rate),
      })),
      providerErrors: providerErrorStats,
      driftEvents: driftEvents,
      alerts: alerts,
      events: events.map((e: any) => ({
        id: e.id,
        createdAt: e.created_at,
        routeId: e.route_id,
        routePath: e.route_path,
        promptType: e.prompt_type,
        fingerprint: e.fingerprint,
        provider: e.provider,
        model: e.model,
        status: e.status,
        errorCode: e.error_code,
        userId: e.user_id,
        mode: e.mode,
        feature: e.feature,
        builder: e.builder,
        executionTimeMs: e.execution_time_ms,
        promptLength: e.prompt_length,
      })),
      drift: driftData.map((d: any) => ({
        routeId: d.route_id,
        currentFingerprint: d.current_fingerprint,
        previousFingerprint: d.previous_fingerprint,
        changedAt: d.changed_at,
      })),
      incidents: recentIncidents.map((i: any) => ({
        id: i.id,
        createdAt: i.created_at,
        severity: i.severity,
        title: i.title,
        detail: i.detail,
        snapshot: i.snapshot,
        resolvedAt: i.resolved_at,
        resolutionNote: i.resolution_note,
      })),
      safeModeEnabled,
    })
  } catch (error: any) {
    console.error("[PROMPT-HEALTH] Error fetching audit events:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
