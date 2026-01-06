"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AdminNav } from "@/components/admin/admin-nav"

interface CronJob {
  jobName: string
  schedule: string
  path: string
  lastRun: {
    status: string
    startedAt: string
    finishedAt: string | null
    durationMs: number | null
    summary: Record<string, any>
  } | null
  runCount24h: number
  lastError: {
    message: string
    createdAt: string
  } | null
}

export default function CronDiagnosticsPage() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [sinceHours, setSinceHours] = useState(24)

  useEffect(() => {
    fetchCronStatus()
  }, [sinceHours])

  const fetchCronStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/diagnostics/cron-status?since=${sinceHours}`)
      const data = await response.json()
      if (data.success && data.jobs) {
        setCronJobs(data.jobs)
      }
    } catch (error) {
      console.error("Error fetching cron status:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-2">
                Cron & Email Status
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                Monitor scheduled jobs and email campaign execution
              </p>
            </div>
            <Link
              href="/admin"
              className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-600 hover:text-stone-950 transition-colors border-b border-stone-300 pb-1"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-4 mb-6">
            <label className="text-xs sm:text-sm text-stone-600">Time Range:</label>
            <select
              value={sinceHours}
              onChange={(e) => setSinceHours(Number(e.target.value))}
              className="text-xs sm:text-sm border border-stone-300 bg-white px-3 py-1.5 rounded-none focus:outline-none focus:ring-1 focus:ring-stone-400"
            >
              <option value={1}>Last Hour</option>
              <option value={24}>Last 24 Hours</option>
              <option value={168}>Last 7 Days</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-stone-200 p-12 text-center rounded-none">
            <p className="text-sm text-stone-500">Loading cron status...</p>
          </div>
        ) : cronJobs.length === 0 ? (
          <div className="bg-white border border-stone-200 p-12 text-center rounded-none">
            <p className="text-sm text-stone-500">No cron jobs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cronJobs.map((job) => (
              <div
                key={job.jobName}
                className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {job.lastRun?.status === "ok" ? (
                      <span className="text-2xl">✅</span>
                    ) : job.lastRun?.status === "failed" ? (
                      <span className="text-2xl">❌</span>
                    ) : (
                      <span className="text-2xl text-stone-400">⏸</span>
                    )}
                    <div>
                      <h3 className="text-base sm:text-lg font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
                        {job.jobName.replace(/-/g, " ")}
                      </h3>
                      <p className="text-xs text-stone-500 mt-1">{job.path}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm text-stone-600">
                      Schedule: <code className="bg-stone-100 px-2 py-0.5">{job.schedule}</code>
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {job.runCount24h} run{job.runCount24h !== 1 ? "s" : ""} in last {sinceHours}h
                    </p>
                  </div>
                </div>

                {job.lastRun ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-stone-200">
                    <div>
                      <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em] mb-1">
                        Last Run
                      </p>
                      <p className="text-xs sm:text-sm text-stone-950">
                        {new Date(job.lastRun.startedAt).toLocaleString()}
                      </p>
                    </div>
                    {job.lastRun.finishedAt && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em] mb-1">
                          Duration
                        </p>
                        <p className="text-xs sm:text-sm text-stone-950">
                          {job.lastRun.durationMs ? `${(job.lastRun.durationMs / 1000).toFixed(1)}s` : "N/A"}
                        </p>
                      </div>
                    )}
                    {job.lastRun.summary && Object.keys(job.lastRun.summary).length > 0 && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em] mb-1">
                          Summary
                        </p>
                        <div className="text-xs sm:text-sm text-stone-950 space-y-0.5">
                          {job.lastRun.summary.campaignsProcessed && (
                            <p>Campaigns: {job.lastRun.summary.campaignsProcessed}</p>
                          )}
                          {job.lastRun.summary.emailsSent && (
                            <p>Emails Sent: {job.lastRun.summary.emailsSent}</p>
                          )}
                          {job.lastRun.summary.emailsFailed && (
                            <p className="text-red-600">Failed: {job.lastRun.summary.emailsFailed}</p>
                          )}
                          {job.lastRun.summary.segmentsRefreshed && (
                            <p>Segments: {job.lastRun.summary.segmentsRefreshed}</p>
                          )}
                          {job.lastRun.summary.totalMembers && (
                            <p>Members: {job.lastRun.summary.totalMembers}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {job.lastError && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-red-600 uppercase tracking-[0.1em] mb-1">
                          Last Error
                        </p>
                        <p className="text-xs text-red-600 truncate" title={job.lastError.message}>
                          {job.lastError.message}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-1">
                          {new Date(job.lastError.createdAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-stone-200">
                    <p className="text-xs text-stone-500">No runs recorded yet</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

