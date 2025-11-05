"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, Clock, Mail, Webhook } from "lucide-react"

interface WebhookHealth {
  stats: {
    totalErrors: number
    criticalErrors: number
    warningErrors: number
    resolvedErrors: number
    successRate: number
    totalWebhooks: number
  }
  recentErrors: Array<{
    id: number
    eventType: string
    errorMessage: string
    severity: string
    isResolved: boolean
    createdAt: string
  }>
}

interface EmailMetrics {
  stats: {
    totalSent: number
    delivered: number
    failed: number
    pending: number
    retried: number
    deliveryRate: number
  }
  recentEmails: Array<{
    id: number
    recipient: string
    subject: string
    status: string
    retryCount: number
    errorMessage: string | null
    createdAt: string
  }>
}

export function SystemHealthMonitor() {
  const [webhookHealth, setWebhookHealth] = useState<WebhookHealth | null>(null)
  const [emailMetrics, setEmailMetrics] = useState<EmailMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHealthData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchHealthData = async () => {
    try {
      const [webhookRes, emailRes] = await Promise.all([
        fetch("/api/admin/dashboard/webhook-health"),
        fetch("/api/admin/dashboard/email-metrics"),
      ])

      if (webhookRes.ok) {
        const webhookData = await webhookRes.json()
        setWebhookHealth(webhookData)
      }

      if (emailRes.ok) {
        const emailData = await emailRes.json()
        setEmailMetrics(emailData)
      }
    } catch (error) {
      console.error("[v0] Error fetching health data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (rate: number) => {
    if (rate >= 95) return "text-green-600"
    if (rate >= 85) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusIcon = (rate: number) => {
    if (rate >= 95) return <CheckCircle className="w-5 h-5 text-green-600" />
    if (rate >= 85) return <Clock className="w-5 h-5 text-yellow-600" />
    return <AlertCircle className="w-5 h-5 text-red-600" />
  }

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-1/3"></div>
          <div className="h-32 bg-stone-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* System Health Overview */}
      <div className="bg-gradient-to-br from-stone-950 to-stone-800 rounded-[1.75rem] overflow-hidden border border-stone-700 shadow-2xl">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.3em] uppercase text-white">
              SYSTEM HEALTH
            </h2>
            <div className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-stone-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Monitoring
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Webhook Health */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Webhook className="w-6 h-6 text-white" />
                  <h3 className="text-sm tracking-[0.2em] uppercase text-white">Webhooks</h3>
                </div>
                {webhookHealth && getStatusIcon(webhookHealth.stats.successRate)}
              </div>

              {webhookHealth && (
                <>
                  <div className="mb-4">
                    <p
                      className={`text-4xl font-['Times_New_Roman'] font-extralight ${getStatusColor(webhookHealth.stats.successRate)}`}
                    >
                      {webhookHealth.stats.successRate}%
                    </p>
                    <p className="text-xs text-stone-400 mt-1">Success Rate (24h)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-white font-medium">{webhookHealth.stats.totalWebhooks}</p>
                      <p className="text-stone-400">Total Events</p>
                    </div>
                    <div>
                      <p className="text-red-400 font-medium">{webhookHealth.stats.criticalErrors}</p>
                      <p className="text-stone-400">Critical Errors</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Email Health */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6 text-white" />
                  <h3 className="text-sm tracking-[0.2em] uppercase text-white">Email Delivery</h3>
                </div>
                {emailMetrics && getStatusIcon(emailMetrics.stats.deliveryRate)}
              </div>

              {emailMetrics && (
                <>
                  <div className="mb-4">
                    <p
                      className={`text-4xl font-['Times_New_Roman'] font-extralight ${getStatusColor(emailMetrics.stats.deliveryRate)}`}
                    >
                      {emailMetrics.stats.deliveryRate}%
                    </p>
                    <p className="text-xs text-stone-400 mt-1">Delivery Rate (24h)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-white font-medium">{emailMetrics.stats.totalSent}</p>
                      <p className="text-stone-400">Emails Sent</p>
                    </div>
                    <div>
                      <p className="text-red-400 font-medium">{emailMetrics.stats.failed}</p>
                      <p className="text-stone-400">Failed</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Webhook Errors */}
      {webhookHealth && webhookHealth.recentErrors.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
          <h3 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
            RECENT WEBHOOK ERRORS
          </h3>
          <div className="space-y-3">
            {webhookHealth.recentErrors.slice(0, 5).map((error) => (
              <div
                key={error.id}
                className={`flex items-start gap-4 p-4 rounded-xl border ${
                  error.severity === "critical"
                    ? "bg-red-50 border-red-200"
                    : error.isResolved
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <AlertCircle
                  className={`w-5 h-5 mt-0.5 ${
                    error.severity === "critical"
                      ? "text-red-600"
                      : error.isResolved
                        ? "text-green-600"
                        : "text-yellow-600"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-stone-900">{error.eventType}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        error.severity === "critical"
                          ? "bg-red-100 text-red-700"
                          : error.isResolved
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {error.severity}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mb-2 truncate">{error.errorMessage}</p>
                  <p className="text-xs text-stone-400">
                    {new Date(error.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Email Logs */}
      {emailMetrics && emailMetrics.recentEmails.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
          <h3 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
            RECENT EMAIL ACTIVITY
          </h3>
          <div className="space-y-3">
            {emailMetrics.recentEmails.slice(0, 5).map((email) => (
              <div
                key={email.id}
                className={`flex items-start gap-4 p-4 rounded-xl border ${
                  email.status === "delivered"
                    ? "bg-green-50 border-green-200"
                    : email.status === "failed"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <Mail
                  className={`w-5 h-5 mt-0.5 ${
                    email.status === "delivered"
                      ? "text-green-600"
                      : email.status === "failed"
                        ? "text-red-600"
                        : "text-yellow-600"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-stone-900 truncate">{email.recipient}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        email.status === "delivered"
                          ? "bg-green-100 text-green-700"
                          : email.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {email.status}
                    </span>
                    {email.retryCount > 0 && (
                      <span className="text-xs text-stone-500">({email.retryCount} retries)</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mb-2 truncate">{email.subject}</p>
                  {email.errorMessage && <p className="text-xs text-red-600 mb-2 truncate">{email.errorMessage}</p>}
                  <p className="text-xs text-stone-400">
                    {new Date(email.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
