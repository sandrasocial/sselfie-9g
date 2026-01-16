"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, Clock } from "lucide-react"
import { AdminLoadingState, AdminErrorState } from "@/components/admin/shared"
import { formatAdminDate } from "@/lib/admin/format-utils"

interface CronJobRun {
  status: string | null
  startedAt: string | null
  finishedAt: string | null
  durationMs: number | null
  summary: Record<string, any> | null
  errorMessage: string | null
}

interface CronJobRow {
  jobName: string
  path: string
  lastRunAt: string | null
  lastStatus: string | null
  runsLast24h: number
  runsLast7d: number
  lastSummary: Record<string, any> | null
  lastErrorMessage: string | null
  lastDurationMs: number | null
  recentRuns: CronJobRun[]
  anomaly: {
    flagged: boolean
    reasons: Array<{ metric: string; value: number; threshold: number } | { metric: string; value: string }>
    latestCounts: {
      welcomeCredits: number
      membershipCredits: number
      backfilledPayments: number
    }
    maxCounts: {
      welcomeCredits: number
      membershipCredits: number
      backfilledPayments: number
    }
  }
}

interface CronHealthData {
  generatedAt: string
  jobs: CronJobRow[]
}

export default function CronHealthPage() {
  const [data, setData] = useState<CronHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const simulate =
        typeof window !== "undefined" &&
        process.env.NODE_ENV !== "production" &&
        new URLSearchParams(window.location.search).get("simulate") === "anomaly"
          ? "?simulate=anomaly"
          : ""
      const res = await fetch(`/api/admin/cron-health${simulate}`)
      if (!res.ok) throw new Error("Failed to fetch cron health data")
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load cron health data")
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
  }, [])

  if (loading) {
    return <AdminLoadingState message="Loading cron job health..." />
  }

  if (error || !data) {
    return (
      <AdminErrorState
        title="Cron Health Data Unavailable"
        message={error || "Failed to load cron health data"}
        onRetry={fetchData}
        suggestions={[
          "Check your internet connection",
          "Verify the API endpoint is responding",
          "Ensure admin_cron_runs table exists",
        ]}
      />
    )
  }

  const { jobs } = data

  // Helper to format duration
  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A"
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Helper to format time ago
  const timeAgo = (date: string | null) => {
    if (!date) return "Never"
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const formatSummary = (summary: Record<string, any> | null) => {
    if (!summary || Object.keys(summary).length === 0) return "—"
    return Object.entries(summary)
      .slice(0, 4)
      .map(([key, value]) => `${key}:${String(value)}`)
      .join(", ")
  }

  const formatStatus = (status: string | null) => {
    if (!status) return { label: "Unknown", tone: "bg-stone-100 text-stone-700" }
    if (status === "ok") return { label: "OK", tone: "bg-green-100 text-green-800" }
    if (status === "failed") return { label: "Failed", tone: "bg-red-100 text-red-800" }
    return { label: status, tone: "bg-stone-100 text-stone-700" }
  }

  const formatAnomaly = (job: CronJobRow) => {
    if (!job.anomaly?.flagged) return { label: "OK", tone: "bg-stone-100 text-stone-700" }
    return { label: "FLAGGED", tone: "bg-red-100 text-red-800" }
  }

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
                  Cron Job Health
                </h1>
                <p className="text-sm text-stone-500 tracking-widest uppercase mt-1">
                  Real-time Monitoring
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="px-4 py-2 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
              aria-label={refreshing ? "Refreshing data" : "Refresh cron health data"}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cron Job Status */}
        <div className="bg-white border border-stone-200 rounded-none mb-8">
          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
              Cron Job Status (Last 7 Days)
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Per-path execution history from cron_runs
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Last Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Runs 24h
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Runs 7d
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Anomaly
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Last Summary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {jobs.map((job) => {
                  const status = formatStatus(job.lastStatus)
                  const anomaly = formatAnomaly(job)
                  return (
                    <tr key={job.path} className="hover:bg-stone-50">
                      <td className="px-6 py-4 text-sm font-medium text-stone-900">
                        <div className="flex flex-col">
                          <span>{job.path}</span>
                          <span className="text-xs text-stone-400">{job.jobName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-500">
                        <div className="flex flex-col">
                          <span>{timeAgo(job.lastRunAt)}</span>
                          {job.lastRunAt ? (
                            <span className="text-xs text-stone-400">
                              {formatAdminDate(new Date(job.lastRunAt), "full")}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.tone}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-500">{job.runsLast24h}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">{job.runsLast7d}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${anomaly.tone}`}>
                          {anomaly.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-stone-600">{formatSummary(job.lastSummary)}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">{formatDuration(job.lastDurationMs)}</td>
                    </tr>
                  )
                })}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-stone-500">
                      No cron runs recorded yet. Cron jobs will appear after their first execution.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          {jobs.map((job) => (
            <details key={`${job.path}-recent`} className="bg-white border border-stone-200 rounded-none">
              <summary className="px-6 py-4 cursor-pointer text-sm text-stone-700">
                Recent Runs · {job.path}
              </summary>
              <div className="px-6 pb-4">
                {job.anomaly?.flagged ? (
                  <div className="mb-3 rounded-none border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <p className="font-medium text-red-900">Anomaly details</p>
                    <ul className="mt-2 space-y-1">
                      {job.anomaly.reasons.map((reason, idx) => (
                        <li key={idx}>
                          {"threshold" in reason
                            ? `${reason.metric}: ${reason.value} (max ${reason.threshold})`
                            : `${reason.metric}: ${reason.value}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {job.recentRuns.length === 0 ? (
                  <p className="text-xs text-stone-500">No runs in the last 7 days.</p>
                ) : (
                  <div className="divide-y divide-stone-200">
                    {job.recentRuns.map((run, idx) => (
                      <div key={idx} className="py-3 text-xs text-stone-600">
                        <div className="flex items-center justify-between">
                          <span>{run.startedAt ? formatAdminDate(new Date(run.startedAt), "full") : "Unknown time"}</span>
                          <span className="text-stone-400">{formatDuration(run.durationMs)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="uppercase tracking-widest text-stone-400">{run.status || "unknown"}</span>
                          <span className="text-stone-500">{formatSummary(run.summary)}</span>
                        </div>
                        {run.errorMessage ? (
                          <p className="mt-2 text-xs text-red-700">{run.errorMessage}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>

        {/* Auto-refresh notice */}
        <div className="mt-8 text-center text-xs text-stone-400">
          <Clock className="w-4 h-4 inline-block mr-1" aria-hidden="true" />
          Auto-refreshes every 60 seconds
        </div>
      </div>
    </div>
  )
}
