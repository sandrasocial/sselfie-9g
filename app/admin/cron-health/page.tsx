"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, Clock, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react"
import { AdminLoadingState, AdminErrorState } from "@/components/admin/shared"
import { formatAdminDate } from "@/lib/admin/format-utils"

interface CronHealthData {
  summary: {
    totalJobs: number
    healthyJobs: number
    warningJobs: number
    criticalJobs: number
    avgSuccessRate: number
    failureCount: number
  }
  healthDashboard: any[]
  recentFailures: any[]
  allJobs: any[]
  performanceHistory: any[]
}

export default function CronHealthPage() {
  const [data, setData] = useState<CronHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const res = await fetch("/api/admin/cron-health")
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
          "Ensure cron_job_logs table exists",
        ]}
      />
    )
  }

  const { summary, healthDashboard, recentFailures, allJobs } = data

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
                <p className="text-sm text-stone-500 tracking-[0.1em] uppercase mt-1">
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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
            </div>
            <p className="text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
              {summary.healthyJobs}
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400">
              Healthy Jobs
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Out of {summary.totalJobs} total
            </p>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" aria-hidden="true" />
            </div>
            <p className="text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
              {summary.avgSuccessRate.toFixed(1)}%
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400">
              Avg Success Rate
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Across all jobs
            </p>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" aria-hidden="true" />
            </div>
            <p className="text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
              {summary.warningJobs}
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400">
              Warning
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Needs attention
            </p>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />
            </div>
            <p className="text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
              {summary.criticalJobs}
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400">
              Critical
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Urgent action needed
            </p>
          </div>
        </div>

        {/* Job Health Status */}
        <div className="bg-white border border-stone-200 rounded-none mb-8">
          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
              Job Health Status
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              All cron jobs sorted by health
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Job Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Last Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Avg Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Executions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {healthDashboard.map((job: any, idx: number) => (
                  <tr key={idx} className="hover:bg-stone-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">
                      {job.job_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">
                        <span className="text-lg">{job.health_status}</span>
                        {job.status_text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                      {job.success_rate ? `${job.success_rate.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {timeAgo(job.last_run_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {formatDuration(job.average_duration_ms)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {job.total_executions || 0}
                    </td>
                  </tr>
                ))}
                {healthDashboard.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-stone-500">
                      No cron health data available yet. Jobs will appear here after their first execution.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {allJobs.slice(0, 6).map((job: any) => (
            <div key={job.job_name} className="bg-white border border-stone-200 rounded-none p-6">
              <h3 className="text-sm font-medium text-stone-950 mb-4">{job.job_name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Success Rate</p>
                  <p className="text-2xl font-['Times_New_Roman'] font-extralight text-stone-950">
                    {job.success_rate ? `${job.success_rate.toFixed(1)}%` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Avg Duration</p>
                  <p className="text-2xl font-['Times_New_Roman'] font-extralight text-stone-950">
                    {formatDuration(job.average_duration_ms)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Total Runs</p>
                  <p className="text-2xl font-['Times_New_Roman'] font-extralight text-stone-950">
                    {job.total_executions}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Last Run</p>
                  <p className="text-2xl font-['Times_New_Roman'] font-extralight text-stone-950">
                    {timeAgo(job.last_run_at)}
                  </p>
                </div>
              </div>
              {job.last_status === 'failed' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-medium text-red-800 mb-1">Last Error:</p>
                  <p className="text-xs text-red-700 font-mono">
                    {job.last_error || 'Unknown error'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recent Failures */}
        {recentFailures.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-none">
            <div className="px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-light tracking-wide text-stone-950">
                Recent Failures (24H)
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                {recentFailures.length} failure{recentFailures.length !== 1 ? 's' : ''} in the last 24 hours
              </p>
            </div>
            <div className="divide-y divide-stone-200">
              {recentFailures.map((failure: any, idx: number) => (
                <div key={idx} className="px-6 py-4 hover:bg-stone-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-stone-950">{failure.job_name}</p>
                      <p className="text-xs text-stone-500 mt-1">
                        {formatAdminDate(new Date(failure.started_at), 'full')}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Failed
                    </span>
                  </div>
                  {failure.error_message && (
                    <div className="mt-2 p-3 bg-stone-50 rounded-lg">
                      <p className="text-xs font-mono text-stone-700">
                        {failure.error_message}
                      </p>
                    </div>
                  )}
                  {failure.metadata && Object.keys(failure.metadata).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-stone-500">
                        Metadata: {JSON.stringify(failure.metadata)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {recentFailures.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-none p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-serif font-light text-stone-950 mb-2">
              No Recent Failures
            </h3>
            <p className="text-sm text-stone-500">
              All cron jobs have been running successfully for the last 24 hours.
            </p>
          </div>
        )}

        {/* Auto-refresh notice */}
        <div className="mt-8 text-center text-xs text-stone-400">
          <Clock className="w-4 h-4 inline-block mr-1" aria-hidden="true" />
          Auto-refreshes every 60 seconds
        </div>
      </div>
    </div>
  )
}
