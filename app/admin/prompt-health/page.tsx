"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react"
import { AdminLoadingState, AdminErrorState } from "@/components/admin/shared"
import { formatAdminDate } from "@/lib/admin/format-utils"

interface PromptAuditEvent {
  id: string
  createdAt: string
  routeId: string
  routePath: string | null
  promptType: string | null
  fingerprint: string
  provider: string | null
  model: string | null
  status: string
  errorCode: string | null
  userId: string | null
  mode: string | null
  feature: string | null
  builder: string | null
  executionTimeMs: number | null
  promptLength: number | null
}

interface DriftInfo {
  routeId: string
  currentFingerprint: string
  previousFingerprint: string | null
  changedAt: string | null
}

interface Alert {
  severity: 'red' | 'orange' | 'yellow'
  title: string
  detail: string
  routeId?: string
  metricSnapshot?: Record<string, any>
}

interface RouteStats {
  routeId: string
  total: number
  errors: number
  errorRate: number
}

interface ProviderErrorStats {
  provider: string | null
  model: string | null
  errorCount: number
}

interface DriftEvent {
  routeId: string
  changeCount: number
  lastChangedAt: string | null
}

interface IncidentEvent {
  id: string
  createdAt: string
  severity: 'red' | 'orange' | 'yellow'
  title: string
  detail: string
  snapshot: Record<string, any>
  resolvedAt: string | null
  resolutionNote: string | null
}

interface PromptHealthData {
  generatedAt: string
  summary: {
    eventsLast24h: number
    errorsLast24h: number
    uniqueFingerprintsLast24h: number
    topRoutes: Array<{ routeId: string; volume: number }>
  }
  totalsByStatus?: Array<{ status: string; count: number }>
  totalsByRoute?: RouteStats[]
  errorRateByRoute?: RouteStats[]
  providerErrors?: ProviderErrorStats[]
  driftEvents?: DriftEvent[]
  alerts?: Alert[]
  events: PromptAuditEvent[]
  drift: DriftInfo[]
  incidents?: IncidentEvent[]
  safeModeEnabled?: boolean
}

export default function PromptHealthPage() {
  const [data, setData] = useState<PromptHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [routeFilter, setRouteFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [timeRange, setTimeRange] = useState<string>("24h")

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams()
      if (routeFilter) params.set("routeId", routeFilter)
      if (statusFilter) params.set("status", statusFilter)
      params.set("timeRange", timeRange)

      const res = await fetch(`/api/admin/prompt-health?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch prompt health data")
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load prompt health data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [routeFilter, statusFilter, timeRange])

  if (loading) {
    return <AdminLoadingState message="Loading prompt health data..." />
  }

  if (error || !data) {
    return (
      <AdminErrorState
        title="Prompt Health Data Unavailable"
        message={error || "Failed to load prompt health data"}
        onRetry={fetchData}
        suggestions={[
          "Check your internet connection",
          "Verify the API endpoint is responding",
          "Ensure prompt_audit_events table exists",
        ]}
      />
    )
  }

  const { summary, events, drift, alerts = [], errorRateByRoute = [], driftEvents = [], incidents = [], safeModeEnabled = false } = data

  // Get unique route IDs for filter
  const uniqueRouteIds = Array.from(new Set(events.map((e) => e.routeId))).sort()

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-stone-600 hover:text-stone-950 transition-colors"
                aria-label="Go back to admin dashboard"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </Link>
              <div>
                <h1 className="text-3xl font-serif font-light tracking-wide text-stone-950">
                  Prompt Health Dashboard
                </h1>
                <p className="text-sm text-stone-500 tracking-widest uppercase mt-1">
                  Monitor Prompt Generation & Drift Detection
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="px-4 py-2 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Safe Mode Badge */}
        {safeModeEnabled && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <div className="font-medium text-red-900">Safe Mode Enabled</div>
                <div className="text-sm text-red-700">
                  Rate limits tightened and internal endpoints protected. Monitor incidents closely.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-stone-200 rounded-none p-6">
            <div className="text-sm text-stone-500 uppercase tracking-wider mb-1">Events (24h)</div>
            <div className="text-3xl font-serif font-light text-stone-950">{summary.eventsLast24h}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-none p-6">
            <div className="text-sm text-stone-500 uppercase tracking-wider mb-1">Errors (24h)</div>
            <div className="text-3xl font-serif font-light text-red-600">{summary.errorsLast24h}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-none p-6">
            <div className="text-sm text-stone-500 uppercase tracking-wider mb-1">Unique Fingerprints</div>
            <div className="text-3xl font-serif font-light text-stone-950">
              {summary.uniqueFingerprintsLast24h}
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-none p-6">
            <div className="text-sm text-stone-500 uppercase tracking-wider mb-1">Top Route</div>
            <div className="text-lg font-serif font-light text-stone-950">
              {summary.topRoutes[0]?.routeId || "—"}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              {summary.topRoutes[0]?.volume || 0} events
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-stone-200 rounded-none p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-stone-500 uppercase tracking-wider mb-2">
                Route ID
              </label>
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              >
                <option value="">All Routes</option>
                {uniqueRouteIds.map((routeId) => (
                  <option key={routeId} value={routeId}>
                    {routeId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 uppercase tracking-wider mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="ok">OK</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 uppercase tracking-wider mb-2">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Incidents Section */}
        {incidents.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-none mb-8">
            <div className="px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
                Recent Incidents ({incidents.filter((i) => !i.resolvedAt).length} unresolved)
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Auto-recorded from RED alerts (last 20 incidents)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {incidents.map((incident) => {
                    const severityColors = {
                      red: 'bg-red-100 text-red-800',
                      orange: 'bg-orange-100 text-orange-800',
                      yellow: 'bg-yellow-100 text-yellow-800',
                    }
                    return (
                      <tr key={incident.id} className="hover:bg-stone-50">
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {formatAdminDate(incident.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${severityColors[incident.severity]}`}>
                            {incident.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-stone-950">{incident.title}</td>
                        <td className="px-6 py-4">
                          {incident.resolvedAt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-stone-100 text-stone-800">
                              <AlertCircle className="w-3 h-3" />
                              Unresolved
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Incidents Section */}
        {incidents.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-none mb-8">
            <div className="px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
                Recent Incidents ({incidents.filter(i => !i.resolvedAt).length} unresolved)
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Incident events from RED alerts (last 20)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {incidents.map((incident) => {
                    const severityColors = {
                      red: 'bg-red-100 text-red-800',
                      orange: 'bg-orange-100 text-orange-800',
                      yellow: 'bg-yellow-100 text-yellow-800',
                    }
                    return (
                      <tr key={incident.id} className="hover:bg-stone-50">
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {formatAdminDate(incident.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${severityColors[incident.severity]}`}>
                            {incident.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-stone-950">{incident.title}</td>
                        <td className="px-6 py-4">
                          {incident.resolvedAt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-none mb-8">
            <div className="px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
                Active Alerts ({alerts.length})
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Health signals requiring attention (sorted by severity)
              </p>
            </div>
            <div className="p-6 space-y-3">
              {alerts.map((alert, idx) => {
                const severityColors = {
                  red: 'bg-red-50 border-red-200 text-red-900',
                  orange: 'bg-orange-50 border-orange-200 text-orange-900',
                  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
                }
                const severityIcons = {
                  red: AlertTriangle,
                  orange: AlertCircle,
                  yellow: AlertCircle,
                }
                const Icon = severityIcons[alert.severity]
                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 ${severityColors[alert.severity]}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium mb-1">{alert.title}</div>
                        <div className="text-sm opacity-90">{alert.detail}</div>
                        {alert.metricSnapshot && (
                          <div className="mt-2 text-xs opacity-75 font-mono">
                            {JSON.stringify(alert.metricSnapshot, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Top Error Rate Routes */}
        {errorRateByRoute.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-none mb-8">
            <div className="px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
                Top Error Rate Routes
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Routes with highest error rates (minimum 10 events)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Route ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Total Events
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Errors
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Error Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {errorRateByRoute.map((route) => (
                    <tr key={route.routeId} className="hover:bg-stone-50">
                      <td className="px-6 py-4 text-sm font-medium text-stone-950">{route.routeId}</td>
                      <td className="px-6 py-4 text-sm text-stone-600">{route.total}</td>
                      <td className="px-6 py-4 text-sm text-stone-600">{route.errors}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-medium ${
                            route.errorRate >= 20
                              ? 'text-red-600'
                              : route.errorRate >= 10
                                ? 'text-orange-600'
                                : 'text-stone-600'
                          }`}
                        >
                          {route.errorRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Drift Watchlist */}
        {driftEvents.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-none mb-8">
            <div className="px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
                Drift Watchlist
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Routes with fingerprint changes in selected time window
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Route ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Change Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Last Changed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {driftEvents.map((d) => (
                    <tr key={d.routeId} className="hover:bg-stone-50">
                      <td className="px-6 py-4 text-sm font-medium text-stone-950">{d.routeId}</td>
                      <td className="px-6 py-4 text-sm text-stone-600">{d.changeCount}</td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        {d.lastChangedAt ? formatAdminDate(d.lastChangedAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Drift Detection */}
        {drift.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-none mb-8">
            <div className="px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
                Fingerprint Drift Detection (Last 7 Days)
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Routes where prompt fingerprints have changed (potential prompt edits)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Route ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Current Fingerprint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Previous Fingerprint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Changed At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {drift.map((d) => (
                    <tr key={d.routeId} className="hover:bg-stone-50">
                      <td className="px-6 py-4 text-sm font-medium text-stone-950">{d.routeId}</td>
                      <td className="px-6 py-4 text-sm text-stone-600 font-mono">{d.currentFingerprint}</td>
                      <td className="px-6 py-4 text-sm text-stone-600 font-mono">
                        {d.previousFingerprint || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        {d.changedAt ? formatAdminDate(d.changedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Events Table */}
        <div className="bg-white border border-stone-200 rounded-none">
          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
              Recent Events ({events.length})
            </h2>
            <p className="text-xs text-stone-500 mt-1">Last 200 prompt generation events</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Route ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Fingerprint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Provider/Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-stone-50">
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {formatAdminDate(event.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-stone-950">{event.routeId}</td>
                    <td className="px-6 py-4 text-sm text-stone-600 font-mono">
                      {event.fingerprint.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {event.provider || event.model ? `${event.provider || ""} ${event.model || ""}`.trim() : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {event.status === "ok" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3" />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3" />
                          Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
