"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AdminNav } from "@/components/admin/admin-nav"

interface EmailSettings {
  emailSendingEnabled: boolean
  emailTestMode: boolean
}

interface EmailStats {
  sent: number
  failed: number
  skippedDisabled: number
  skippedTestMode: number
  skippedDryRun: number
  total: number
}

interface ScheduledCampaign {
  id: number
  campaign_name: string
  campaign_type: string
  subject_line: string
  scheduled_for: string
  status: string
}

interface CronStat {
  job_name: string
  success_count: number
  failed_count: number
  last_run: string | null
}

interface ResendBroadcast {
  id: string
  name?: string | null
  subject?: string | null
  status?: string | null
  sent_at?: string | null
  scheduled_at?: string | null
  created_at?: string | null
  segment_id?: string | null
  segmentName?: string | null
  dashboardUrl?: string | null
}

interface EmailAnalyticsSummary {
  overallStats: {
    totalSent: number
    totalOpened: number
    totalClicked: number
    totalConverted: number
    openRate: number
    clickRate: number
    conversionRate: number
    delivered: number
    bounced: number
    complained: number
  }
}

interface ActiveSequence {
  jobName: string
  label: string
  schedule: string | null
  nextRun: string | null
  eligibleCount: number
  active: boolean
  segments: Array<{
    id: string
    name: string
    size: number
    key: string
  }>
}

interface SegmentSummary {
  id: string
  name: string
  size: number
}

interface WebhookHealth {
  webhooksReceived24h: number
  webhookSecretSet: boolean
  healthy: boolean
}

interface AudienceInfo {
  count: number | null
  status: "connected" | "missing" | "error"
  error?: string | null
}

interface ResendConfigInfo {
  apiKeyConfigured: boolean
  audienceIdConfigured: boolean
}

export default function EmailControlPage() {
  const [settings, setSettings] = useState<EmailSettings>({
    emailSendingEnabled: false,
    emailTestMode: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null)
  const [scheduledCampaigns, setScheduledCampaigns] = useState<ScheduledCampaign[]>([])
  const [testEmailSending, setTestEmailSending] = useState(false)
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null)
  const [testRecipient, setTestRecipient] = useState("")
  const [emailAnalytics, setEmailAnalytics] = useState<EmailAnalyticsSummary | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [cronStats, setCronStats] = useState<CronStat[]>([])
  const [dryRunEnabled, setDryRunEnabled] = useState(false)
  const [lastBroadcast, setLastBroadcast] = useState<ResendBroadcast | null>(null)
  const [broadcasts, setBroadcasts] = useState<ResendBroadcast[]>([])
  const [activeSequences, setActiveSequences] = useState<ActiveSequence[]>([])
  const [webhookHealth, setWebhookHealth] = useState<WebhookHealth | null>(null)
  const [audienceInfo, setAudienceInfo] = useState<AudienceInfo>({
    count: null,
    status: "missing",
  })
  const [resendConfig, setResendConfig] = useState<ResendConfigInfo | null>(null)
  const [segments, setSegments] = useState<SegmentSummary[]>([])

  useEffect(() => {
    fetchSettings()
    fetchStats()
    fetchAnalytics()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/email-control/settings")
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/email-control/stats")
      const data = await response.json()
      if (data.success) {
        setEmailStats(data.emailStats)
        setScheduledCampaigns(data.scheduledCampaigns || [])
        setCronStats(data.cronStats || [])
        setDryRunEnabled(Boolean(data.dryRunEnabled))
        setLastBroadcast(data.lastBroadcast || null)
        setBroadcasts(Array.isArray(data.broadcasts) ? data.broadcasts : [])
        if (data.audience) {
          setAudienceInfo({
            count: typeof data.audience.count === "number" ? data.audience.count : null,
            status: data.audience.status || "missing",
            error: data.audience.error || null,
          })
        }
        if (data.resendConfig) {
          setResendConfig({
            apiKeyConfigured: Boolean(data.resendConfig.apiKeyConfigured),
            audienceIdConfigured: Boolean(data.resendConfig.audienceIdConfigured),
          })
        }
        setSegments(Array.isArray(data.segments) ? data.segments : [])
        setActiveSequences(Array.isArray(data.activeSequences) ? data.activeSequences : [])
        setWebhookHealth(data.webhookHealth || null)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      const response = await fetch("/api/admin/email-analytics")
      if (response.ok) {
        const data = await response.json()
        setEmailAnalytics(data)
      }
    } catch (error) {
      console.error("Error fetching email analytics:", error)
    } finally {
      setAnalyticsLoading(false)
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
        setTimeout(() => fetchStats(), 1000)
      }
    } catch (error) {
      console.error("Error updating setting:", error)
    } finally {
      setSaving(false)
    }
  }

  const sendTestEmail = async () => {
    setTestEmailSending(true)
    setTestEmailResult(null)
    try {
      const response = await fetch("/api/admin/email-control/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Test Email from SSELFIE Admin",
          template: "test",
          to: testRecipient || undefined,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setTestEmailResult(`✅ Test email sent successfully! Message ID: ${data.messageId}`)
      } else {
        setTestEmailResult(`❌ Failed: ${data.error}`)
      }
    } catch (error: any) {
      setTestEmailResult(`❌ Error: ${error.message}`)
    } finally {
      setTestEmailSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <div className="max-w-5xl mx-auto p-8">
          <p className="text-sm text-stone-500">Loading...</p>
        </div>
      </div>
    )
  }
  const webhookBadge = webhookHealth
    ? webhookHealth.healthy
      ? { label: "Healthy", className: "text-green-600" }
      : webhookHealth.webhookSecretSet
        ? { label: "No events", className: "text-amber-600" }
        : { label: "Secret missing", className: "text-red-600" }
    : { label: "Unknown", className: "text-stone-500" }

  const missingSegments = activeSequences.flatMap((sequence) =>
    sequence.segments
      .filter((segment) => !segment.id)
      .map((segment) => ({
        sequenceLabel: sequence.label,
        segmentName: segment.name,
        segmentKey: segment.key,
      })),
  )

  const audienceLabel =
    audienceInfo.status === "connected"
      ? `${audienceInfo.count ?? "—"}`
      : audienceInfo.status === "missing"
        ? "Not connected"
        : "Check connection"

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-5xl mx-auto p-6 sm:p-8">
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-2">
                Email Control Center
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                A simple view of what is sending, what is scheduled, and what needs setup
              </p>
            </div>
            <Link
              href="/admin"
              className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-600 hover:text-stone-950 transition-colors border-b border-stone-300 pb-1"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Status Strip */}
        <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="border border-stone-200 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1">Sending</p>
              <p className="text-xs text-stone-950">{settings.emailSendingEnabled ? "On" : "Off"}</p>
            </div>
            <div className="border border-stone-200 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1">Test Mode</p>
              <p className="text-xs text-stone-950">{settings.emailTestMode ? "Only admins" : "All recipients"}</p>
            </div>
            <div className="border border-stone-200 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1">Dry Run</p>
              <p className="text-xs text-stone-950">{dryRunEnabled ? "Preview only" : "Live sends"}</p>
            </div>
            <div className="border border-stone-200 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1">Last Broadcast</p>
              <p className="text-xs text-stone-950">
                {lastBroadcast?.status || "None"}
              </p>
            </div>
            <div className="border border-stone-200 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1">Audience</p>
              <p className="text-xs text-stone-950">
                {audienceLabel}
              </p>
              {audienceInfo.error && (
                <p className="text-[10px] text-amber-600 mt-1">{audienceInfo.error}</p>
              )}
            </div>
            <div className="border border-stone-200 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1">Webhooks</p>
              <p className={`text-xs ${webhookBadge.className}`}>{webhookBadge.label}</p>
            </div>
          </div>
        </div>

        {/* Email Control Toggles */}
        <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-6">
            Global Controls
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

        {/* Test Email */}
        <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-4">
            Send Test Email
          </h2>
          <p className="text-xs text-stone-500 mb-4">
            Send a test email to yourself to verify email sending is working
          </p>
          <div className="mb-4">
            <label className="text-xs text-stone-500 block mb-2">Send test to (optional)</label>
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="you@domain.com"
              className="w-full border border-stone-200 px-3 py-2 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </div>
          <button
            onClick={sendTestEmail}
            disabled={testEmailSending || saving}
            className="bg-stone-950 text-white px-4 py-2 text-xs sm:text-sm tracking-[0.1em] uppercase hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testEmailSending ? "Sending..." : "Send Test Email"}
          </button>
          {testEmailResult && (
            <p className={`text-xs mt-3 ${testEmailResult.includes("✅") ? "text-green-600" : "text-red-600"}`}>
              {testEmailResult}
            </p>
          )}
        </div>

        {/* Email Analytics Summary */}
        <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
              Email Engagement (30d)
            </h2>
            <button
              type="button"
              onClick={fetchAnalytics}
              className="text-xs tracking-[0.15em] uppercase text-stone-600 hover:text-stone-950 transition-colors"
            >
              Refresh
            </button>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-4">
            These numbers update when Resend webhooks arrive
          </p>
          {analyticsLoading ? (
            <p className="text-xs text-stone-500">Loading analytics...</p>
          ) : emailAnalytics?.overallStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="border border-stone-200 p-4">
                <p className="text-xs text-stone-500 mb-1">Total Sent</p>
                <p className="text-lg text-stone-950">{emailAnalytics.overallStats.totalSent}</p>
              </div>
              <div className="border border-stone-200 p-4">
                <p className="text-xs text-stone-500 mb-1">Open Rate</p>
                <p className="text-lg text-stone-950">{emailAnalytics.overallStats.openRate}%</p>
              </div>
              <div className="border border-stone-200 p-4">
                <p className="text-xs text-stone-500 mb-1">Click Rate</p>
                <p className="text-lg text-stone-950">{emailAnalytics.overallStats.clickRate}%</p>
              </div>
              <div className="border border-stone-200 p-4">
                <p className="text-xs text-stone-500 mb-1">Conversion Rate</p>
                <p className="text-lg text-stone-950">{emailAnalytics.overallStats.conversionRate}%</p>
              </div>
              <div className="border border-stone-200 p-4">
                <p className="text-xs text-stone-500 mb-1">Delivered</p>
                <p className="text-lg text-stone-950">{emailAnalytics.overallStats.delivered}</p>
              </div>
              <div className="border border-stone-200 p-4">
                <p className="text-xs text-stone-500 mb-1">Bounced / Complained</p>
                <p className="text-lg text-stone-950">
                  {emailAnalytics.overallStats.bounced} / {emailAnalytics.overallStats.complained}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-500">No analytics data available.</p>
          )}
        </div>

        {/* Recent Broadcasts */}
        <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
              Recent Broadcasts
            </h2>
            <button
              type="button"
              onClick={fetchStats}
              className="text-xs tracking-[0.15em] uppercase text-stone-600 hover:text-stone-950 transition-colors"
            >
              Refresh
            </button>
          </div>
          {broadcasts.length === 0 ? (
            <p className="text-xs text-stone-500">No broadcasts yet. When a sequence sends, it will show here.</p>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="border border-stone-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-stone-950">
                        {broadcast.subject || broadcast.name || "Untitled broadcast"}
                      </p>
                      <p className="text-[10px] text-stone-500 mt-1">
                        Audience: {broadcast.segmentName || "All subscribers"}
                      </p>
                      <p className="text-[10px] text-stone-500 mt-1">
                        Status: {broadcast.status || "unknown"}
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-stone-500">
                      <p>
                        {broadcast.sent_at
                          ? `Sent: ${new Date(broadcast.sent_at).toLocaleString()}`
                          : broadcast.scheduled_at
                            ? `Scheduled: ${new Date(broadcast.scheduled_at).toLocaleString()}`
                            : broadcast.created_at
                              ? `Created: ${new Date(broadcast.created_at).toLocaleString()}`
                              : "—"}
                      </p>
                      {broadcast.dashboardUrl ? (
                        <a
                          href={broadcast.dashboardUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-stone-600 hover:text-stone-950 transition-colors"
                        >
                          View in Resend
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-widest uppercase">
                Edit Marketing Emails
              </h2>
              <p className="text-xs text-stone-500 mt-2">
                Update the content for all live marketing sequences and broadcasts.
              </p>
            </div>
            <a
              href="/admin/email-templates"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-stone-900 text-white text-xs tracking-[0.15em] uppercase"
            >
              Open Template Editor
            </a>
          </div>
        </div>

        {/* Cron Status */}
        <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-4">
            Email Cron Status (24h)
          </h2>
          {cronStats.length === 0 ? (
            <p className="text-xs text-stone-500">No cron runs found in the last 24 hours.</p>
          ) : (
            <div className="space-y-3">
              {cronStats.map((stat) => (
                <div key={stat.job_name} className="flex items-center justify-between border border-stone-200 p-3">
                  <div>
                    <p className="text-xs text-stone-950">{stat.job_name.replace(/-/g, " ")}</p>
                    <p className="text-[10px] text-stone-500">
                      Last run: {stat.last_run ? new Date(stat.last_run).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="text-[10px] text-stone-500">
                    {stat.success_count} ok • {stat.failed_count} failed
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audience + Segment Health */}
        <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
              Audience & Segments
            </h2>
            <button
              type="button"
              onClick={fetchStats}
              className="text-xs tracking-[0.15em] uppercase text-stone-600 hover:text-stone-950 transition-colors"
            >
              Refresh
            </button>
          </div>
          <p className="text-xs text-stone-500 mb-2">
            Audience size: {audienceInfo.count ?? "—"}
            {audienceInfo.status !== "connected" && " (not connected)"}
          </p>
          {resendConfig && (!resendConfig.apiKeyConfigured || !resendConfig.audienceIdConfigured) && (
            <div className="border border-amber-200 bg-amber-50 p-3 mb-4">
              <p className="text-xs text-amber-800">
                Connection needed: {resendConfig.apiKeyConfigured ? "Audience ID" : "API key"} is missing in server settings.
              </p>
            </div>
          )}
          {segments.length === 0 ? (
            <p className="text-xs text-stone-500">No segments found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {segments.slice(0, 6).map((segment) => (
                <div key={segment.id} className="border border-stone-200 p-4">
                  <p className="text-xs text-stone-950 mb-1">{segment.name}</p>
                  <p className="text-[10px] text-stone-500">Size: {segment.size}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Sequences */}
        <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-4">
            Automations
          </h2>
          {missingSegments.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 p-4 mb-4">
              <p className="text-xs text-amber-800 mb-2">
                Some automations are not connected to a Resend segment yet.
              </p>
              <div className="space-y-1">
                {missingSegments.slice(0, 6).map((segment, index) => (
                  <p key={`${segment.segmentKey}-${index}`} className="text-[10px] text-amber-700">
                    {segment.sequenceLabel}: missing segment for {segment.segmentName} ({segment.segmentKey})
                  </p>
                ))}
              </div>
            </div>
          )}
          {activeSequences.length === 0 ? (
            <p className="text-xs text-stone-500">No automations are configured yet.</p>
          ) : (
            <div className="space-y-3">
              {activeSequences.map((sequence) => (
                <div key={sequence.jobName} className="border border-stone-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-stone-950">{sequence.label}</p>
                    <span
                      className={`text-[10px] uppercase tracking-[0.2em] ${
                        sequence.active ? "text-green-600" : "text-stone-500"
                      }`}
                    >
                      {sequence.active ? "Active" : "Idle"}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    People ready to receive: {sequence.eligibleCount}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-1">
                    Next send: {sequence.nextRun ? new Date(sequence.nextRun).toLocaleString() : "—"} • Schedule:{" "}
                    {sequence.schedule || "Not scheduled"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Scheduled Campaigns */}
        {scheduledCampaigns.length > 0 && (
          <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-4">
              Next Scheduled Campaigns
            </h2>
            <div className="space-y-3">
              {scheduledCampaigns.map((campaign) => (
                <div key={campaign.id} className="border-b border-stone-200 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-stone-950">{campaign.campaign_name}</h3>
                      <p className="text-xs text-stone-500 mt-1">{campaign.subject_line}</p>
                      <p className="text-[10px] text-stone-400 mt-1">
                        Type: {campaign.campaign_type} • Status: {campaign.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-600">
                        {new Date(campaign.scheduled_for).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last 24h Email Stats */}
        {emailStats && (
          <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none">
            <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-4">
              Last 24h Email Stats
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl sm:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
                  {emailStats.sent}
                </p>
                <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em]">Sent</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-['Times_New_Roman'] font-extralight text-red-600 mb-1">
                  {emailStats.failed}
                </p>
                <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em]">Failed</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-['Times_New_Roman'] font-extralight text-stone-400 mb-1">
                  {emailStats.skippedDisabled}
                </p>
                <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em]">Skipped (Disabled)</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-['Times_New_Roman'] font-extralight text-stone-400 mb-1">
                  {emailStats.skippedTestMode}
                </p>
                <p className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.1em]">Skipped (Test Mode)</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-200">
              <p className="text-xs text-stone-500">
                Total attempts: {emailStats.total}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

