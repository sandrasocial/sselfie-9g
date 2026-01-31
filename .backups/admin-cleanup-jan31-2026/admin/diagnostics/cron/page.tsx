"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AdminNav } from "@/components/admin/admin-nav"

interface EmailSettings {
  emailSendingEnabled: boolean
  emailTestMode: boolean
}

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

interface EmailTypeStatus {
  emailType: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  failed: number
  bounced: number
  complained: number
  skippedDisabled: number
  skippedTestMode: number
  total: number
  openRate: string
  clickRate: string
  lastSentAt: string | null
  firstSentAt: string | null
}

interface EmailStatus {
  totals: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    failed: number
    bounced: number
    complained: number
    skippedDisabled: number
    skippedTestMode: number
    total: number
    overallOpenRate: string
    overallClickRate: string
  }
  emailTypes: EmailTypeStatus[]
  recentSends: Array<{
    id: number
    userEmail: string
    emailType: string
    status: string
    sentAt: string
    resendMessageId: string | null
    errorMessage: string | null
    opened: boolean
    openedAt: string | null
    clicked: boolean
    clickedAt: string | null
  }>
}

export default function CronDiagnosticsPage() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [sinceHours, setSinceHours] = useState(24)
  const [settings, setSettings] = useState<EmailSettings>({
    emailSendingEnabled: false,
    emailTestMode: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCronStatus()
    fetchEmailStatus()
    fetchSettings()
  }, [sinceHours])

  const fetchCronStatus = async () => {
    try {
      const response = await fetch(`/api/admin/diagnostics/cron-status?since=${sinceHours}`)
      const data = await response.json()
      if (data.success && data.jobs) {
        setCronJobs(data.jobs)
      }
    } catch (error) {
      console.error("Error fetching cron status:", error)
    }
  }

  const fetchEmailStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/diagnostics/email-status?since=${sinceHours}`)
      const data = await response.json()
      if (data.success) {
        setEmailStatus(data)
      }
    } catch (error) {
      console.error("Error fetching email status:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/email-control/settings")
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    }
  }

  const updateSetting = async (key: keyof EmailSettings, value: boolean) => {
    setSaving(true)
    try {
      const response = await fetch("/api/admin/email-control/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
        // Refresh stats after changing settings
        setTimeout(() => {
          fetchEmailStatus()
        }, 1000)
      }
    } catch (error) {
      console.error("Error updating setting:", error)
    } finally {
      setSaving(false)
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
                Monitor scheduled jobs and ALL email sends (cron + manual)
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

          {/* Email Control Toggles */}
          <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none mb-6">
            <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-6">
              Email Controls
            </h2>

            <div className="space-y-6">
              {/* Email Sending Enabled */}
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-sm sm:text-base font-medium text-stone-950 mb-1">
                    Email Sending Enabled
                  </h3>
                  <p className="text-xs text-stone-500">
                    {settings.emailSendingEnabled
                      ? "Emails will be sent to recipients"
                      : "All email sending is disabled (kill switch)"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!saving) {
                      updateSetting("emailSendingEnabled", !settings.emailSendingEnabled)
                    }
                  }}
                  disabled={saving}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 ${
                    settings.emailSendingEnabled ? "bg-stone-950" : "bg-stone-300"
                  } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  aria-label={settings.emailSendingEnabled ? "Disable email sending" : "Enable email sending"}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      settings.emailSendingEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Test Mode */}
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-sm sm:text-base font-medium text-stone-950 mb-1">
                    Test Mode
                  </h3>
                  <p className="text-xs text-stone-500">
                    {settings.emailTestMode
                      ? "Emails only send to admin email or whitelisted addresses"
                      : "Normal mode: emails send to all recipients"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!saving) {
                      updateSetting("emailTestMode", !settings.emailTestMode)
                    }
                  }}
                  disabled={saving}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 ${
                    settings.emailTestMode ? "bg-stone-950" : "bg-stone-300"
                  } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  aria-label={settings.emailTestMode ? "Disable test mode" : "Enable test mode"}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      settings.emailTestMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-stone-200 p-12 text-center rounded-none">
            <p className="text-sm text-stone-500">Loading status...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Email Status Summary */}
            {emailStatus && (
              <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
                    All Email Status ({sinceHours}h)
                  </h2>
                  <p className="text-[10px] text-stone-400">
                    📡 Engagement data from Resend webhooks
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                  <div>
                    <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em] mb-1">Total Sent</p>
                    <p className="text-xl sm:text-2xl font-light text-green-600">{emailStatus.totals.sent}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em] mb-1">Delivered</p>
                    <p className="text-xl sm:text-2xl font-light text-blue-600">{emailStatus.totals.delivered}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em] mb-1">Opened</p>
                    <p className="text-xl sm:text-2xl font-light text-purple-600">{emailStatus.totals.opened}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{emailStatus.totals.overallOpenRate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em] mb-1">Clicked</p>
                    <p className="text-xl sm:text-2xl font-light text-indigo-600">{emailStatus.totals.clicked}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{emailStatus.totals.overallClickRate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em] mb-1">Failed</p>
                    <p className="text-xl sm:text-2xl font-light text-red-600">{emailStatus.totals.failed}</p>
                    {emailStatus.totals.bounced > 0 && (
                      <p className="text-[10px] text-orange-600 mt-0.5">+{emailStatus.totals.bounced} bounced</p>
                    )}
                  </div>
                </div>

                {/* Email Types Breakdown */}
                <div className="mt-6">
                  <h3 className="text-sm sm:text-base font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-3">
                    By Email Type
                  </h3>
                  <div className="space-y-2">
                    {emailStatus.emailTypes.length === 0 ? (
                      <p className="text-xs text-stone-500">No emails sent in this period</p>
                    ) : (
                      emailStatus.emailTypes.map((type) => (
                        <div
                          key={type.emailType}
                          className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-none"
                        >
                          <div className="flex-1">
                            <p className="text-xs sm:text-sm font-medium text-stone-950">{type.emailType}</p>
                            {type.lastSentAt && (
                              <p className="text-[10px] text-stone-500 mt-0.5">
                                Last: {new Date(type.lastSentAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs flex-wrap">
                            <span className="text-green-600">✓ {type.sent}</span>
                            {type.delivered > 0 && <span className="text-blue-600">📬 {type.delivered}</span>}
                            {type.opened > 0 && (
                              <span className="text-purple-600" title={`${type.openRate}% open rate`}>
                                👁️ {type.opened} ({type.openRate}%)
                              </span>
                            )}
                            {type.clicked > 0 && (
                              <span className="text-indigo-600" title={`${type.clickRate}% click rate`}>
                                🖱️ {type.clicked} ({type.clickRate}%)
                              </span>
                            )}
                            {type.failed > 0 && <span className="text-red-600">✗ {type.failed}</span>}
                            {type.bounced > 0 && <span className="text-orange-600">⚠️ {type.bounced}</span>}
                            {type.complained > 0 && <span className="text-red-800">🚫 {type.complained}</span>}
                            {type.skippedDisabled > 0 && (
                              <span className="text-stone-400">⏸ {type.skippedDisabled}</span>
                            )}
                            {type.skippedTestMode > 0 && (
                              <span className="text-stone-400">🧪 {type.skippedTestMode}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Cron Jobs */}
            <div>
              <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-4">
                Cron Jobs
              </h2>
              {cronJobs.length === 0 ? (
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
        )}
      </div>
    </div>
  )
}


