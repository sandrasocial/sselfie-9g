"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { AdminLoadingState, AdminErrorState } from "@/components/admin/shared"
import { formatAdminDate } from "@/lib/admin/format-utils"

type HealthStatus = "green" | "yellow" | "red"

interface BlueprintHealthResponse {
  windowStart: string
  windowEnd: string
  metrics: {
    signups: number
    blueprintSubscribers: number
    freeCreditsGranted: number
    previewFeedsCreated: number
    previewGenerationsStarted: number
    paidPurchases: number
    fullFeedPlannersCreated: number
    paidSingleGenerationsStarted: number
    freeWelcomeEmailsSent: number
    paidDeliveryEmailsSent: number
  }
  health: {
    status: HealthStatus
    reasons: string[]
  }
  recent: Record<string, Array<{ id: string | number; occurredAt: string }>>
}

const METRICS: Array<{
  key: keyof BlueprintHealthResponse["metrics"]
  label: string
  description: string
}> = [
  { key: "signups", label: "Signups", description: "Users created" },
  { key: "blueprintSubscribers", label: "Blueprint subscribers", description: "Blueprint records created" },
  { key: "freeCreditsGranted", label: "Free credits granted", description: "Welcome bonus credit grants" },
  { key: "previewFeedsCreated", label: "Preview feeds created", description: "Preview layouts created" },
  { key: "previewGenerationsStarted", label: "Preview generations started", description: "Preview posts with prediction" },
  { key: "paidPurchases", label: "Paid purchases", description: "Paid blueprint purchases" },
  { key: "fullFeedPlannersCreated", label: "Full feed planners created", description: "Paid grid layouts created" },
  { key: "paidSingleGenerationsStarted", label: "Paid single generations started", description: "Paid posts with prediction" },
  { key: "freeWelcomeEmailsSent", label: "Free welcome emails sent", description: "Day-0 welcome emails" },
  { key: "paidDeliveryEmailsSent", label: "Paid delivery emails sent", description: "Delivery emails sent" },
]

const statusStyles: Record<HealthStatus, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
}

export default function BlueprintHealthPage() {
  const [data, setData] = useState<BlueprintHealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const res = await fetch("/api/admin/blueprint-health")
      if (!res.ok) throw new Error("Failed to fetch blueprint health data")
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load blueprint health data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <AdminLoadingState message="Loading blueprint health..." />
  }

  if (error || !data) {
    return (
      <AdminErrorState
        title="Blueprint Health Unavailable"
        message={error || "Failed to load blueprint health data"}
        onRetry={fetchData}
        suggestions={[
          "Check your internet connection",
          "Verify the API endpoint is responding",
          "Ensure blueprint tables exist in the database",
        ]}
      />
    )
  }

  const { windowStart, windowEnd, metrics, health, recent } = data

  return (
    <div className="min-h-screen bg-stone-50">
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
                  Blueprint Health
                </h1>
                <p className="text-sm text-stone-500 tracking-widest uppercase mt-1">
                  Last 24 Hours
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="px-4 py-2 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
              aria-label={refreshing ? "Refreshing data" : "Refresh blueprint health data"}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-white border border-stone-200 rounded-none p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
                Blueprint Health Status
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                {formatAdminDate(windowStart, "short")} - {formatAdminDate(windowEnd, "short")}
              </p>
            </div>
            <span className={`px-3 py-1 text-xs uppercase tracking-widest rounded-full ${statusStyles[health.status]}`}>
              {health.status}
            </span>
          </div>
          <div className="mt-4 text-sm text-stone-600">
            {health.reasons.length > 0 ? (
              <ul className="space-y-1">
                {health.reasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>• {reason}</li>
                ))}
              </ul>
            ) : (
              <p>No anomalies detected in the last 24 hours.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-none">
          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
              Funnel Metrics
            </h2>
            <p className="text-xs text-stone-500 mt-1">Aggregated counts, no PII</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {METRICS.map((metric) => (
                  <tr key={metric.key}>
                    <td className="px-6 py-4 text-sm text-stone-900">{metric.label}</td>
                    <td className="px-6 py-4 text-sm text-stone-900">{metrics[metric.key]}</td>
                    <td className="px-6 py-4 text-xs text-stone-500">{metric.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-none">
          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
              Recent Evidence (Last 10)
            </h2>
            <p className="text-xs text-stone-500 mt-1">IDs + timestamps only</p>
          </div>
          <div className="p-6 grid gap-4 sm:grid-cols-2">
            {METRICS.map((metric) => {
              const rows = recent[metric.key] || []
              return (
                <details key={metric.key} className="border border-stone-200 rounded-none p-4">
                  <summary className="text-sm text-stone-900 cursor-pointer">
                    {metric.label} ({rows.length})
                  </summary>
                  <div className="mt-3 space-y-2 text-xs text-stone-600">
                    {rows.length === 0 ? (
                      <p>No recent entries.</p>
                    ) : (
                      rows.map((row) => (
                        <div key={`${metric.key}-${row.id}`} className="flex items-center justify-between gap-3">
                          <span className="truncate">ID {row.id}</span>
                          <span>{formatAdminDate(row.occurredAt, "time")}</span>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
