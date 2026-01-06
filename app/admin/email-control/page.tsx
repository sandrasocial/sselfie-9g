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

  useEffect(() => {
    fetchSettings()
    fetchStats()
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
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
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
                Control email sending globally and test safely
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

