"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { AdminNav } from "./admin-nav"
import { AdminLoadingState, AdminMetricCard } from "./shared"
import { formatAdminDate } from "@/lib/admin/format-utils"
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react"

type MarketingHealthResponse = {
  now: string
  range: { days: number }
  config: {
    resendAudienceIdConfigured: boolean
    resendApiKeyConfigured: boolean
    upstashConfigured: boolean
    segments: Array<{
      key: string
      value: string
      isMissing: boolean
      hasWhitespace: boolean
    }>
  }
  health: {
    stuckQueue: {
      processingOver15m: number
      cleanupProcessingOver15m: number
    }
    staleRunsOver30m: number
    segmentIdWhitespaceInRuns: {
      count: number
      emailTypes: string[]
    }
  }
  runs: {
    latestByEmailType: Array<any>
    countsByEmailTypeStatus: Array<any>
    queueCountsForLatest: Array<any>
    failedLast48h: Array<any>
  }
  errors: {
    recentLast48h: Array<any>
  }
  recommendations: string[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function statusLabel(ok: boolean) {
  return ok ? "OK" : "NEEDS ATTENTION"
}

async function postJson(url: string, body?: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = String(data?.error || data?.details || `Request failed (${res.status})`)
    throw new Error(msg)
  }
  return data
}

export function MarketingHealthDashboard() {
  const [days, setDays] = useState(7)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { data, error, isLoading, mutate, isValidating } = useSWR<MarketingHealthResponse>(
    `/api/admin/marketing/health?days=${days}&limitRuns=50&limitErrors=40`,
    fetcher,
    { refreshInterval: 0 },
  )

  const segmentStats = useMemo(() => {
    const segments = data?.config?.segments || []
    const missing = segments.filter((s) => s.isMissing).length
    const whitespace = segments.filter((s) => s.hasWhitespace && !s.isMissing).length
    return { missing, whitespace, total: segments.length }
  }, [data])

  const problemCount =
    (data?.health?.stuckQueue?.processingOver15m || 0) +
    (data?.health?.stuckQueue?.cleanupProcessingOver15m || 0) +
    (data?.health?.staleRunsOver30m || 0) +
    (data?.health?.segmentIdWhitespaceInRuns?.count || 0) +
    segmentStats.missing +
    segmentStats.whitespace

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <AdminLoadingState message="Loading marketing health..." fullScreen={false} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h1 className="font-['Times_New_Roman'] text-2xl sm:text-3xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              MARKETING HEALTH
            </h1>
            <p className="text-xs text-stone-500 tracking-[0.1em] uppercase mt-2">
              Failed to load report.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => mutate()}
                className="inline-flex items-center justify-center gap-2 bg-stone-950 text-white px-4 py-3 text-xs tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors rounded-none"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center border border-stone-200 bg-white px-4 py-3 text-xs tracking-[0.2em] uppercase text-stone-700 hover:bg-stone-50 transition-colors rounded-none"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const reportTime = data.now ? new Date(data.now) : new Date()
  const isOk = problemCount === 0 && data.config.resendAudienceIdConfigured && data.config.resendApiKeyConfigured

  const runRecovery = async () => {
    setActionMessage(null)
    setActionLoading(true)
    try {
      const result = await postJson("/api/admin/marketing/recover")
      const resetProcessing = Number(result?.reset?.resetProcessing || 0)
      const resetCleanup = Number(result?.reset?.resetCleanupProcessing || 0)
      const failedRuns = Number(result?.stale?.failedRuns || 0)
      setActionMessage(
        `Recovery complete. Queue resets: ${resetProcessing} processing, ${resetCleanup} cleanup. Stale runs failed: ${failedRuns}.`,
      )
      await mutate()
    } catch (e: any) {
      setActionMessage(`Recovery failed: ${String(e?.message || e)}`)
    } finally {
      setActionLoading(false)
    }
  }

  const processRun = async (runId: string) => {
    setActionMessage(null)
    setActionLoading(true)
    try {
      await postJson("/api/admin/marketing/runs/process", { runId })
      setActionMessage("Run processed. Refreshing report.")
      await mutate()
    } catch (e: any) {
      setActionMessage(`Run process failed: ${String(e?.message || e)}`)
    } finally {
      setActionLoading(false)
    }
  }

  const retryCleanup = async (runId: string) => {
    setActionMessage(null)
    setActionLoading(true)
    try {
      await postJson("/api/admin/marketing/runs/retry-cleanup", { runId })
      setActionMessage("Cleanup retry started. Refreshing report.")
      await mutate()
    } catch (e: any) {
      setActionMessage(`Cleanup retry failed: ${String(e?.message || e)}`)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10 sm:mb-14">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="font-['Times_New_Roman'] text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-3 sm:mb-4">
                MARKETING HEALTH
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 tracking-[0.1em] uppercase">
                {formatAdminDate(reportTime, "full")} • Last updated {formatAdminDate(reportTime, "time")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2">
                <label className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Range</label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="bg-white border border-stone-200 px-3 py-2 text-xs tracking-[0.15em] uppercase text-stone-900 rounded-none"
                  aria-label="Select report range"
                >
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              <button
                onClick={() => mutate()}
                className="inline-flex items-center justify-center gap-2 bg-stone-950 text-white px-4 py-3 text-xs tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors rounded-none disabled:opacity-60"
                disabled={isValidating}
              >
                <RefreshCw className="w-4 h-4" />
                {isValidating ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            {isOk ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />
                <p className="text-[10px] sm:text-xs tracking-[0.15em] uppercase text-stone-600">
                  Status: {statusLabel(true)}
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                <p className="text-[10px] sm:text-xs tracking-[0.15em] uppercase text-stone-600">
                  Status: {statusLabel(false)}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-none mb-10 sm:mb-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                OPERATIONS
              </h2>
              <p className="text-[10px] tracking-[0.15em] uppercase text-stone-400 mt-2">
                Recovery is safe and idempotent.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={runRecovery}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 bg-stone-950 text-white px-4 py-3 text-xs tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors rounded-none disabled:opacity-60"
              >
                Run Recovery
              </button>
            </div>
          </div>
          {actionMessage && (
            <div className="mt-4 border border-stone-200 bg-stone-50 p-4 rounded-none">
              <p className="text-xs text-stone-700 leading-relaxed">{actionMessage}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-14">
          <AdminMetricCard
            label="Stuck Queue (15m+)"
            value={(data.health.stuckQueue.processingOver15m || 0) + (data.health.stuckQueue.cleanupProcessingOver15m || 0)}
            variant={problemCount > 0 ? "primary" : "default"}
            subtitle="processing + cleanup_processing"
            source="marketing_send_queue"
          />
          <AdminMetricCard
            label="Stale Runs (30m+)"
            value={data.health.staleRunsOver30m || 0}
            subtitle="syncing/broadcasting/cleanup"
            source="marketing_send_runs"
          />
          <AdminMetricCard
            label="Segment Whitespace (DB)"
            value={data.health.segmentIdWhitespaceInRuns.count || 0}
            subtitle="segment_id has whitespace/newlines"
            source="marketing_send_runs"
          />
          <AdminMetricCard
            label="Segment Env Issues"
            value={segmentStats.missing + segmentStats.whitespace}
            subtitle={`${segmentStats.missing} missing, ${segmentStats.whitespace} whitespace`}
            source="MARKETING_SEGMENTS"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10 sm:mb-14">
          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              CONFIG
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-[0.15em] uppercase text-stone-500">Resend API</p>
                <p className="text-xs tracking-[0.15em] uppercase text-stone-900">
                  {data.config.resendApiKeyConfigured ? "OK" : "MISSING"}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-[0.15em] uppercase text-stone-500">Resend Audience</p>
                <p className="text-xs tracking-[0.15em] uppercase text-stone-900">
                  {data.config.resendAudienceIdConfigured ? "OK" : "MISSING"}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-[0.15em] uppercase text-stone-500">Upstash</p>
                <p className="text-xs tracking-[0.15em] uppercase text-stone-900">
                  {data.config.upstashConfigured ? "OK" : "NOT CONFIGURED"}
                </p>
              </div>
            </div>
            <p className="mt-5 text-[10px] tracking-[0.1em] uppercase text-stone-400">
              Upstash improves reliability via caching and single-flight locks.
            </p>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              RECOMMENDATIONS
            </h2>
            {data.recommendations.length === 0 ? (
              <p className="text-xs text-stone-600">No recommendations.</p>
            ) : (
              <ul className="space-y-2">
                {data.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-stone-700 leading-relaxed">
                    {rec}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-none mb-10 sm:mb-14">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              LATEST RUNS
            </h2>
            <p className="text-[10px] tracking-[0.15em] uppercase text-stone-400">
              One per email type
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Email Type</th>
                  <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Status</th>
                  <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Recipients</th>
                  <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Created</th>
                  <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Actions</th>
                  <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Error</th>
                </tr>
              </thead>
              <tbody>
                {(data.runs.latestByEmailType || []).map((row: any) => (
                  <tr key={row.run_id} className="border-b border-stone-100">
                    <td className="py-2 pr-4 text-xs text-stone-900 whitespace-nowrap">
                      {row.email_type || row.sequence_key || row.run_id}
                    </td>
                    <td className="py-2 pr-4 text-xs text-stone-700 whitespace-nowrap">{row.status}</td>
                    <td className="py-2 pr-4 text-xs text-stone-700 whitespace-nowrap">
                      {Number(row.processed_recipients || 0)}/{Number(row.total_recipients || 0)}
                    </td>
                    <td className="py-2 pr-4 text-xs text-stone-700 whitespace-nowrap">
                      {formatAdminDate(row.created_at, "relative")}
                    </td>
                    <td className="py-2 pr-4 text-xs text-stone-700 whitespace-nowrap">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {["queued", "syncing", "broadcasting", "cleanup"].includes(String(row.status || "")) && (
                          <button
                            onClick={() => processRun(String(row.run_id))}
                            disabled={actionLoading}
                            className="border border-stone-200 bg-white px-3 py-2 text-[10px] tracking-[0.2em] uppercase text-stone-700 hover:bg-stone-50 transition-colors rounded-none disabled:opacity-60"
                          >
                            Process
                          </button>
                        )}
                        {String(row.status || "") === "failed" && String(row.broadcast_id || "").trim().length > 0 && (
                          <button
                            onClick={() => retryCleanup(String(row.run_id))}
                            disabled={actionLoading}
                            className="border border-stone-200 bg-white px-3 py-2 text-[10px] tracking-[0.2em] uppercase text-stone-700 hover:bg-stone-50 transition-colors rounded-none disabled:opacity-60"
                          >
                            Retry Cleanup
                          </button>
                        )}
                        {String(row.status || "") !== "failed" &&
                          !["queued", "syncing", "broadcasting", "cleanup"].includes(String(row.status || "")) && (
                            <span className="text-[10px] tracking-[0.15em] uppercase text-stone-400">None</span>
                          )}
                        {String(row.status || "") === "failed" && String(row.broadcast_id || "").trim().length === 0 && (
                          <span className="text-[10px] tracking-[0.15em] uppercase text-stone-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-xs text-stone-600 max-w-[420px] truncate">
                      {row.error_message ? String(row.error_message) : ""}
                    </td>
                  </tr>
                ))}
                {(data.runs.latestByEmailType || []).length === 0 && (
                  <tr>
                    <td className="py-3 text-xs text-stone-600" colSpan={6}>
                      No runs found in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              RECENT ERRORS
            </h2>
            <div className="space-y-3">
              {(data.errors.recentLast48h || []).slice(0, 12).map((e: any, idx: number) => (
                <div key={idx} className="border-b border-stone-100 pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 truncate">
                      {String(e.tool_name || "")}
                    </p>
                    <p className="text-[10px] tracking-[0.15em] uppercase text-stone-400 whitespace-nowrap">
                      {formatAdminDate(e.created_at, "relative")}
                    </p>
                  </div>
                  <p className="text-xs text-stone-700 mt-1 leading-relaxed">
                    {String(e.error_message || "").slice(0, 240)}
                  </p>
                </div>
              ))}
              {(data.errors.recentLast48h || []).length === 0 && (
                <p className="text-xs text-stone-600">No errors found.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              SEGMENTS
            </h2>
            <div className="space-y-2">
              {(data.config.segments || []).map((s) => {
                const state = s.isMissing ? "MISSING" : s.hasWhitespace ? "WHITESPACE" : "OK"
                const stateClass =
                  state === "OK"
                    ? "text-green-700"
                    : state === "WHITESPACE"
                      ? "text-amber-700"
                      : "text-red-700"
                return (
                  <div key={s.key} className="flex items-center justify-between gap-4 border-b border-stone-100 pb-2">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-stone-700 truncate">
                      {s.key}
                    </p>
                    <p className={`text-[10px] tracking-[0.2em] uppercase ${stateClass} whitespace-nowrap`}>
                      {state}
                    </p>
                  </div>
                )
              })}
            </div>
            <p className="mt-5 text-[10px] tracking-[0.1em] uppercase text-stone-400">
              Missing or whitespace segments can cause broadcasts to fail.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
