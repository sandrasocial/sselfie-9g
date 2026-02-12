"use client"

import Link from "next/link"
import { DollarSign, Users, Mail, Instagram } from "lucide-react"
import { AdminNav } from "@/components/admin/admin-nav"
import { AdminMetricCard } from "@/components/admin/shared"
import { useEffect, useMemo, useState } from "react"

type FunnelReport = {
  periodStart: string
  periodEnd: string
  metrics: {
    landingViews: number
    pricingViews: number
    checkoutStarts: number
    purchases: number
    newUsers: number
    newSubscriptions: number
    abandonedCheckouts: number
    aiImagesCreated: number
    generationTrackersCreated: number
    stripePaymentsCount: number
    stripePaymentsSumCents: string
    studioOpenedUsers: number
  }
}

type CohortRow = {
  cohortWeek: string
  signups: number
  uploadedSelfies: number
  plannerStarted?: number
  generatedAny: number
  paidActive: number
  retainedD1Proxy?: number
  retainedD1ActivityProxy?: number
}

type StoredReportRow = {
  id: number
  report_type: string
  period_start: string
  period_end: string
  payload: any
  created_at: string
}

export default function AnalyticsPage() {
  const [funnelReports, setFunnelReports] = useState<StoredReportRow[]>([])
  const [cohortReports, setCohortReports] = useState<StoredReportRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState<{ funnel: boolean; cohorts: boolean }>({ funnel: false, cohorts: false })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const [funnelRes, cohortsRes] = await Promise.all([
          fetch("/api/admin/analytics/funnel-daily").then((r) => r.json()),
          fetch("/api/admin/analytics/cohorts-weekly").then((r) => r.json()),
        ])
        if (cancelled) return
        setFunnelReports(Array.isArray(funnelRes?.reports) ? funnelRes.reports : [])
        setCohortReports(Array.isArray(cohortsRes?.reports) ? cohortsRes.reports : [])
      } catch (e: any) {
        if (cancelled) return
        setError(e?.message || "Failed to load analytics")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const latestFunnel = useMemo(() => {
    const row = funnelReports[0]
    if (!row?.payload) return null
    return row.payload as FunnelReport
  }, [funnelReports])

  const revenue24h = useMemo(() => {
    const cents = latestFunnel?.metrics?.stripePaymentsSumCents
    const n = Number(cents || "0")
    if (!Number.isFinite(n)) return null
    return `$${(n / 100).toFixed(0)}`
  }, [latestFunnel])

  const runFunnelNow = async () => {
    try {
      setIsRunning((s) => ({ ...s, funnel: true }))
      const res = await fetch("/api/admin/analytics/funnel-daily", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to run funnel report")
      const refreshed = await fetch("/api/admin/analytics/funnel-daily").then((r) => r.json())
      setFunnelReports(Array.isArray(refreshed?.reports) ? refreshed.reports : [])
    } catch (e: any) {
      setError(e?.message || "Failed to run funnel report")
    } finally {
      setIsRunning((s) => ({ ...s, funnel: false }))
    }
  }

  const runCohortsNow = async () => {
    try {
      setIsRunning((s) => ({ ...s, cohorts: true }))
      const res = await fetch("/api/admin/analytics/cohorts-weekly", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to run cohort report")
      const refreshed = await fetch("/api/admin/analytics/cohorts-weekly").then((r) => r.json())
      setCohortReports(Array.isArray(refreshed?.reports) ? refreshed.reports : [])
    } catch (e: any) {
      setError(e?.message || "Failed to run cohort report")
    } finally {
      setIsRunning((s) => ({ ...s, cohorts: false }))
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10 sm:mb-14">
          <h1 className="font-['Times_New_Roman'] text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-3 sm:mb-4">
            ANALYTICS
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 tracking-[0.1em] uppercase">
            Funnel tracking, daily digest, and weekly cohorts.
          </p>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-none mb-10">
          <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-3">
            STATUS
          </h2>
          {error ? (
            <p className="text-xs text-red-700 leading-relaxed">Error: {error}</p>
          ) : isLoading ? (
            <p className="text-xs text-stone-700 leading-relaxed">Loading analytics reports...</p>
          ) : latestFunnel ? (
            <div className="space-y-2">
              <p className="text-xs text-stone-700 leading-relaxed">
                Latest daily window:{" "}
                <span className="font-mono text-[11px] text-stone-600">
                  {new Date(latestFunnel.periodStart).toISOString()} to {new Date(latestFunnel.periodEnd).toISOString()}
                </span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={runFunnelNow}
                  disabled={isRunning.funnel}
                  className="px-6 py-3 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] uppercase hover:bg-stone-800 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.funnel ? "Running Funnel Report..." : "Run Funnel Report Now"}
                </button>
                <button
                  onClick={runCohortsNow}
                  disabled={isRunning.cohorts}
                  className="px-6 py-3 border border-stone-950 text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-950 hover:text-stone-50 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.cohorts ? "Running Cohort Report..." : "Run Cohort Report Now"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-stone-700 leading-relaxed">
                No reports found yet. Run the reports once, then the daily and weekly crons will keep them updated.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={runFunnelNow}
                  disabled={isRunning.funnel}
                  className="px-6 py-3 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] uppercase hover:bg-stone-800 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.funnel ? "Running Funnel Report..." : "Run Funnel Report Now"}
                </button>
                <button
                  onClick={runCohortsNow}
                  disabled={isRunning.cohorts}
                  className="px-6 py-3 border border-stone-950 text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-950 hover:text-stone-50 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.cohorts ? "Running Cohort Report..." : "Run Cohort Report Now"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
          <AdminMetricCard
            label="Revenue (24h)"
            value={revenue24h || "$--"}
            icon={<DollarSign className="w-5 h-5" />}
            subtitle={latestFunnel ? `Payments: ${latestFunnel.metrics.stripePaymentsCount}` : "Run report for live data"}
          />
          <AdminMetricCard
            label="New Signups"
            value={latestFunnel ? String(latestFunnel.metrics.newUsers) : "--"}
            icon={<Users className="w-5 h-5" />}
            subtitle={latestFunnel ? `Studio opens: ${latestFunnel.metrics.studioOpenedUsers}` : "Run report for live data"}
          />
          <AdminMetricCard
            label="Checkout Starts"
            value={latestFunnel ? String(latestFunnel.metrics.checkoutStarts) : "--"}
            icon={<Mail className="w-5 h-5" />}
            subtitle={latestFunnel ? `Purchases: ${latestFunnel.metrics.purchases}` : "Run report for live data"}
          />
          <AdminMetricCard
            label="Generation Output"
            value={latestFunnel ? String(latestFunnel.metrics.aiImagesCreated) : "--"}
            icon={<Instagram className="w-5 h-5" />}
            subtitle={latestFunnel ? `Trackers: ${latestFunnel.metrics.generationTrackersCreated}` : "Run report for live data"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              Funnel (Daily)
            </h2>
            {latestFunnel ? (
              <div className="space-y-2 text-xs text-stone-700">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Landing views</span>
                  <span className="font-mono text-[11px]">{latestFunnel.metrics.landingViews}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Pricing views</span>
                  <span className="font-mono text-[11px]">{latestFunnel.metrics.pricingViews}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Checkout starts</span>
                  <span className="font-mono text-[11px]">{latestFunnel.metrics.checkoutStarts}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Purchases</span>
                  <span className="font-mono text-[11px]">{latestFunnel.metrics.purchases}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Abandoned checkouts</span>
                  <span className="font-mono text-[11px]">{latestFunnel.metrics.abandonedCheckouts}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-600">Run the funnel report to populate this section.</p>
            )}
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              Cohorts (Weekly)
            </h2>
            {cohortReports[0]?.payload?.rows ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] tracking-[0.12em] uppercase text-stone-500 border-b border-stone-200">
                      <th className="text-left py-2 pr-3">Week</th>
                      <th className="text-right py-2 px-2">Signups</th>
                      <th className="text-right py-2 px-2">Selfies</th>
                      <th className="text-right py-2 px-2">Planner</th>
                      <th className="text-right py-2 px-2">Generated</th>
                      <th className="text-right py-2 px-2">Paid</th>
                      <th className="text-right py-2 px-2">D1 Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cohortReports[0].payload.rows as CohortRow[]).slice(0, 8).map((r, idx) => (
                      <tr key={idx} className="border-b border-stone-100 text-stone-700">
                        <td className="py-2 pr-3 font-mono text-[11px]">{r.cohortWeek}</td>
                        <td className="py-2 px-2 text-right font-mono text-[11px]">{r.signups}</td>
                        <td className="py-2 px-2 text-right font-mono text-[11px]">{r.uploadedSelfies}</td>
                        <td className="py-2 px-2 text-right font-mono text-[11px]">{r.plannerStarted ?? 0}</td>
                        <td className="py-2 px-2 text-right font-mono text-[11px]">{r.generatedAny}</td>
                        <td className="py-2 px-2 text-right font-mono text-[11px]">{r.paidActive}</td>
                        <td className="py-2 px-2 text-right font-mono text-[11px]">{r.retainedD1ActivityProxy ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-stone-600">Run the cohort report to populate this section.</p>
            )}
          </div>
        </div>

        <div className="bg-stone-950 text-white p-8 rounded-none text-center">
          <h3 className="font-['Times_New_Roman'] text-lg tracking-[0.15em] uppercase mb-3">
            NEXT ACTION
          </h3>
          <p className="text-sm text-stone-200 mb-6">
            Use Marketing Health to verify email sequences are delivering. Use this page to track funnel volume,
            checkout behavior, and activation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/admin/marketing"
              className="px-6 py-3 bg-white text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-200 transition-colors rounded-none"
            >
              Open Marketing Health
            </Link>
            <Link
              href="/admin/agents"
              className="px-6 py-3 border border-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-950 transition-colors rounded-none"
            >
              Open Agents
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
