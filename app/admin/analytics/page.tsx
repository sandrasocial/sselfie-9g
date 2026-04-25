"use client"

import Link from "next/link"
import { DollarSign, Users, Mail, Instagram } from "lucide-react"
import { AdminNav } from "@/components/admin/admin-nav"
import { AdminMetricCard } from "@/components/admin/shared"
import { getSafeLaunchConversionOps, type LaunchConversionOps } from "@/lib/analytics/launch-report"
import { useEffect, useMemo, useState, type FormEvent } from "react"

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
  retainedD1ActivityProxy?: number
}

type LaunchReport = {
  conversionOps: LaunchConversionOps
}

type ArpuChurnReport = {
  metrics: {
    membershipMrrCents: number
    activeMemberships: number
    arpuCents: number
    arpuEuro: number
    discountedMembershipsActive: number
    discountedSharePct: number
    fullPriceMembershipsActive: number
    newMemberships30d: number
    churnedMemberships30d: number
    churn30dPct: number
  }
  freezeGuard: {
    discountedDeltaVsLastWeek: number
    freezeHolding: boolean
    note: string
  }
}

type CohortDeliveryReport = {
  summary: {
    liveHours30d: number
    asyncHours30d: number
    totalHours30d: number
    asyncRatio30dPct: number
    liveRatio30dPct: number
    asyncTargetMet: boolean
  }
  monthly: Array<{
    month: string
    liveHours: number
    asyncHours: number
    totalHours: number
    asyncRatioPct: number
  }>
  recentEntries: Array<{
    id: number
    sessionDate: string
    mode: "live" | "async"
    hours: number
    cohortLabel: string | null
    notes: string | null
    createdAt: string
  }>
}

type ActivationKpiReport = {
  windowDays: number
  periodStart: string
  periodEnd: string
  metrics: {
    newSignups: number
    starts: number
    completes: number
    completesWithin5m: number
    completesWithin60m: number
    medianTtfiSeconds: number | null
    medianTtfiMinutes: number | null
  }
  rates: {
    startCoveragePct: number
    completionFromStartsPct: number
    activation5mFromStartsPct: number
    activation60mFromStartsPct: number
    activation60mFromSignupsPct: number
  }
}

type SelfieGuideAnalyticsReport = {
  totals: {
    buyers: number
    guideOpened: number
    guideCompleted: number
    challengeCompleted: number
    studioConverted: number
  }
  rates: {
    guideOpenRate: number
    guideCompletionRate: number
    challengeCompletionRate: number
    studioConversionRate: number
  }
  chapterFunnel: Array<{
    chapter: number
    reached: number
    dropOffFromPrevious: number
  }>
}

type Funnel2026Snapshot = {
  windowDays: number
  periodStart: string
  periodEnd: string
  metrics: {
    guideOptIns: number
    guideAccessOpened: number
    guideUpsellClicks: number
    checkoutStarts: number
    purchases: number
    starterKitAccessOpened: number
    brandStrategyAccessOpened: number
    academyHomeOpened: number
  }
  rates: {
    guideAccessFromOptInPct: number
    upsellClickFromGuideAccessPct: number
    purchaseFromCheckoutStartPct: number
    academyReturnFromPurchasePct: number
  }
  offerPurchases: Array<{
    product: string
    purchases: number
  }>
}

type RevenueEngineReport = {
  periodStart: string
  periodEnd: string
  summary: {
    sessions: number
    purchases: number
    conversionPct: number
    revenueCents: number
    averageOrderValueCents: number
    emailAttributedPurchases: number
    emailAttributedRevenueCents: number
    referralPurchases: number
    referralRevenueCents: number
    bridgeToStudioUsers: number
    bridgeToStudioRatePct: number
  }
  offers: Array<{
    offerSlug: string
    funnelStage: string
    sessions: number
    purchases: number
    conversionPct: number
    revenueCents: number
    averageOrderValueCents: number
  }>
  channels: Array<{
    utmSource: string
    utmMedium: string
    utmCampaign: string
    sessions: number
    purchases: number
    revenueCents: number
  }>
  lifecycle: Array<{
    campaignId: number | null
    utmCampaign: string
    purchases: number
    revenueCents: number
  }>
  referrals: {
    signups: number
    completed: number
    influencedPurchases: number
    influencedRevenueCents: number
  }
  topDropoffs: Array<{
    offerSlug: string
    dropoffCount: number
  }>
}

type StoredReportRow = {
  id: number
  report_type: string
  period_start: string
  period_end: string
  payload: any
  created_at: string
}

function formatEuroFromCents(cents: number) {
  return `€${(cents / 100).toFixed(0)}`
}

async function fetchAdminJson<T>(url: string, label: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`)
    return (await response.json()) as T
  } catch (error) {
    console.error(`[AdminAnalytics] Failed to load ${label}:`, error)
    return fallback
  }
}

export default function AnalyticsPage() {
  const [funnelReports, setFunnelReports] = useState<StoredReportRow[]>([])
  const [cohortReports, setCohortReports] = useState<StoredReportRow[]>([])
  const [launchReports, setLaunchReports] = useState<StoredReportRow[]>([])
  const [arpuReports, setArpuReports] = useState<StoredReportRow[]>([])
  const [deliveryLatest, setDeliveryLatest] = useState<CohortDeliveryReport | null>(null)
  const [activationKpi, setActivationKpi] = useState<ActivationKpiReport | null>(null)
  const [selfieGuideAnalytics, setSelfieGuideAnalytics] = useState<SelfieGuideAnalyticsReport | null>(null)
  const [funnel2026, setFunnel2026] = useState<Funnel2026Snapshot | null>(null)
  const [revenueEngineReports, setRevenueEngineReports] = useState<StoredReportRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState({
    funnel: false,
    cohorts: false,
    launch: false,
    arpu: false,
    delivery: false,
    activationKpi: false,
    selfieGuide: false,
    funnel2026: false,
    revenueEngine: false,
  })
  const [deliveryForm, setDeliveryForm] = useState({
    mode: "live" as "live" | "async",
    hours: "1",
    sessionDate: new Date().toISOString().slice(0, 10),
    cohortLabel: "",
    notes: "",
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const [
          funnelRes,
          cohortsRes,
          launchRes,
          arpuRes,
          deliveryRes,
          activationKpiRes,
          selfieGuideRes,
          funnel2026Res,
          revenueEngineRes,
        ] = await Promise.all([
          fetchAdminJson("/api/admin/analytics/funnel-daily", "funnel daily", { reports: [] }),
          fetchAdminJson("/api/admin/analytics/cohorts-weekly", "cohorts weekly", { reports: [] }),
          fetchAdminJson("/api/admin/analytics/brand-engine-launch", "brand engine launch", { reports: [] }),
          fetchAdminJson("/api/admin/analytics/arpu-churn-weekly", "ARPU churn weekly", { reports: [] }),
          fetchAdminJson("/api/admin/analytics/cohort-delivery-load", "cohort delivery load", { latest: null }),
          fetchAdminJson("/api/admin/analytics/activation-kpi-7d", "activation KPI", { report: null }),
          fetchAdminJson("/api/admin/analytics/selfie-guide", "selfie guide", { totals: null }),
          fetchAdminJson("/api/admin/analytics/funnel-2026", "2026 funnel", { report: null }),
          fetchAdminJson("/api/admin/analytics/revenue-engine", "revenue engine", { reports: [] }),
        ])
        if (cancelled) return

        setFunnelReports(Array.isArray(funnelRes?.reports) ? funnelRes.reports : [])
        setCohortReports(Array.isArray(cohortsRes?.reports) ? cohortsRes.reports : [])
        setLaunchReports(Array.isArray(launchRes?.reports) ? launchRes.reports : [])
        setArpuReports(Array.isArray(arpuRes?.reports) ? arpuRes.reports : [])
        setDeliveryLatest(deliveryRes?.latest || null)
        setActivationKpi(activationKpiRes?.report || null)
        setSelfieGuideAnalytics(selfieGuideRes?.totals ? selfieGuideRes : null)
        setFunnel2026(funnel2026Res?.report || null)
        setRevenueEngineReports(Array.isArray(revenueEngineRes?.reports) ? revenueEngineRes.reports : [])
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

  const latestLaunch = useMemo(() => {
    const row = launchReports[0]
    if (!row?.payload) return null
    return row.payload as Partial<LaunchReport>
  }, [launchReports])
  const latestLaunchOps = useMemo(() => getSafeLaunchConversionOps(latestLaunch), [latestLaunch])

  const latestArpu = useMemo(() => {
    const row = arpuReports[0]
    if (!row?.payload) return null
    return row.payload as ArpuChurnReport
  }, [arpuReports])

  const revenue24h = useMemo(() => {
    const cents = latestFunnel?.metrics?.stripePaymentsSumCents
    const n = Number(cents || "0")
    if (!Number.isFinite(n)) return null
    return `$${(n / 100).toFixed(0)}`
  }, [latestFunnel])

  const latestRevenueEngine = useMemo(() => {
    const row = revenueEngineReports[0]
    if (!row?.payload) return null
    return row.payload as RevenueEngineReport
  }, [revenueEngineReports])

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

  const runRevenueEngineNow = async () => {
    try {
      setIsRunning((s) => ({ ...s, revenueEngine: true }))
      const res = await fetch("/api/admin/analytics/revenue-engine", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to refresh revenue engine report")
      const refreshed = await fetch("/api/admin/analytics/revenue-engine").then((r) => r.json())
      setRevenueEngineReports(Array.isArray(refreshed?.reports) ? refreshed.reports : [])
    } catch (e: any) {
      setError(e?.message || "Failed to refresh revenue engine report")
    } finally {
      setIsRunning((s) => ({ ...s, revenueEngine: false }))
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

  const runLaunchNow = async () => {
    try {
      setIsRunning((s) => ({ ...s, launch: true }))
      const res = await fetch("/api/admin/analytics/brand-engine-launch", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to run launch report")
      const refreshed = await fetch("/api/admin/analytics/brand-engine-launch").then((r) => r.json())
      setLaunchReports(Array.isArray(refreshed?.reports) ? refreshed.reports : [])
    } catch (e: any) {
      setError(e?.message || "Failed to run launch report")
    } finally {
      setIsRunning((s) => ({ ...s, launch: false }))
    }
  }

  const runArpuNow = async () => {
    try {
      setIsRunning((s) => ({ ...s, arpu: true }))
      const res = await fetch("/api/admin/analytics/arpu-churn-weekly", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to run ARPU/churn report")
      const refreshed = await fetch("/api/admin/analytics/arpu-churn-weekly").then((r) => r.json())
      setArpuReports(Array.isArray(refreshed?.reports) ? refreshed.reports : [])
    } catch (e: any) {
      setError(e?.message || "Failed to run ARPU/churn report")
    } finally {
      setIsRunning((s) => ({ ...s, arpu: false }))
    }
  }

  const runDeliverySnapshotNow = async () => {
    try {
      setIsRunning((s) => ({ ...s, delivery: true }))
      const res = await fetch("/api/admin/analytics/cohort-delivery-load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to refresh delivery load")
      setDeliveryLatest(data?.latest || null)
      const refreshed = await fetch("/api/admin/analytics/cohort-delivery-load").then((r) => r.json())
      setDeliveryLatest(refreshed?.latest || null)
    } catch (e: any) {
      setError(e?.message || "Failed to refresh delivery load")
    } finally {
      setIsRunning((s) => ({ ...s, delivery: false }))
    }
  }

  const runActivationKpiNow = async () => {
    try {
      setIsRunning((s) => ({ ...s, activationKpi: true }))
      const res = await fetch("/api/admin/analytics/activation-kpi-7d")
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to refresh activation KPI")
      setActivationKpi(data?.report || null)
    } catch (e: any) {
      setError(e?.message || "Failed to refresh activation KPI")
    } finally {
      setIsRunning((s) => ({ ...s, activationKpi: false }))
    }
  }

  const runSelfieGuideAnalyticsNow = async () => {
    try {
      setIsRunning((s) => ({ ...s, selfieGuide: true }))
      const res = await fetch("/api/admin/analytics/selfie-guide")
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to refresh selfie guide analytics")
      setSelfieGuideAnalytics(data?.totals ? data : null)
    } catch (e: any) {
      setError(e?.message || "Failed to refresh selfie guide analytics")
    } finally {
      setIsRunning((s) => ({ ...s, selfieGuide: false }))
    }
  }

  const runFunnel2026Now = async () => {
    try {
      setIsRunning((s) => ({ ...s, funnel2026: true }))
      const res = await fetch("/api/admin/analytics/funnel-2026")
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to refresh 2026 funnel snapshot")
      setFunnel2026(data?.report || null)
    } catch (e: any) {
      setError(e?.message || "Failed to refresh 2026 funnel snapshot")
    } finally {
      setIsRunning((s) => ({ ...s, funnel2026: false }))
    }
  }

  const submitDeliveryLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setIsRunning((s) => ({ ...s, delivery: true }))
      const res = await fetch("/api/admin/analytics/cohort-delivery-load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: deliveryForm.mode,
          hours: Number(deliveryForm.hours || 0),
          sessionDate: deliveryForm.sessionDate,
          cohortLabel: deliveryForm.cohortLabel,
          notes: deliveryForm.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to log delivery entry")
      setDeliveryLatest(data?.latest || null)
      setDeliveryForm((prev) => ({ ...prev, notes: "", hours: "1" }))
    } catch (e: any) {
      setError(e?.message || "Failed to log delivery entry")
    } finally {
      setIsRunning((s) => ({ ...s, delivery: false }))
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
            Funnel tracking, launch conversion ops, ARPU/churn, and cohort delivery load.
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
          ) : (
            <div className="space-y-3">
              {latestFunnel && (
                <p className="text-xs text-stone-700 leading-relaxed">
                  Latest daily window:{" "}
                  <span className="font-mono text-[11px] text-stone-600">
                    {new Date(latestFunnel.periodStart).toISOString()} to {new Date(latestFunnel.periodEnd).toISOString()}
                  </span>
                </p>
              )}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button
                  onClick={runFunnelNow}
                  disabled={isRunning.funnel}
                  className="px-6 py-3 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] uppercase hover:bg-stone-800 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.funnel ? "Running Funnel..." : "Run Funnel Report"}
                </button>
                <button
                  onClick={runRevenueEngineNow}
                  disabled={isRunning.revenueEngine}
                  className="px-6 py-3 border border-stone-950 text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-950 hover:text-stone-50 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.revenueEngine ? "Refreshing Revenue..." : "Refresh Revenue Engine"}
                </button>
                <button
                  onClick={runCohortsNow}
                  disabled={isRunning.cohorts}
                  className="px-6 py-3 border border-stone-950 text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-950 hover:text-stone-50 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.cohorts ? "Running Cohorts..." : "Run Cohort Report"}
                </button>
                <button
                  onClick={runLaunchNow}
                  disabled={isRunning.launch}
                  className="px-6 py-3 border border-stone-950 text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-950 hover:text-stone-50 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.launch ? "Running Launch..." : "Run Launch Ops Report"}
                </button>
                <button
                  onClick={runArpuNow}
                  disabled={isRunning.arpu}
                  className="px-6 py-3 border border-stone-950 text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-950 hover:text-stone-50 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.arpu ? "Running ARPU..." : "Run ARPU/Churn Report"}
                </button>
                <button
                  onClick={runDeliverySnapshotNow}
                  disabled={isRunning.delivery}
                  className="px-6 py-3 border border-stone-950 text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-950 hover:text-stone-50 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.delivery ? "Refreshing..." : "Refresh Delivery Load"}
                </button>
                <button
                  onClick={runActivationKpiNow}
                  disabled={isRunning.activationKpi}
                  className="px-6 py-3 border border-stone-950 text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-950 hover:text-stone-50 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.activationKpi ? "Refreshing TTFI..." : "Refresh 7D TTFI KPI"}
                </button>
                <button
                  onClick={runSelfieGuideAnalyticsNow}
                  disabled={isRunning.selfieGuide}
                  className="px-6 py-3 border border-stone-950 text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-950 hover:text-stone-50 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.selfieGuide ? "Refreshing Guide..." : "Refresh Selfie Guide Analytics"}
                </button>
                <button
                  onClick={runFunnel2026Now}
                  disabled={isRunning.funnel2026}
                  className="px-6 py-3 border border-stone-950 text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-950 hover:text-stone-50 disabled:opacity-60 transition-colors rounded-none"
                >
                  {isRunning.funnel2026 ? "Refreshing 2026 Funnel..." : "Refresh 2026 Funnel"}
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
          <AdminMetricCard
            label="Revenue Sessions"
            value={latestRevenueEngine ? String(latestRevenueEngine.summary.sessions) : "--"}
            icon={<Mail className="w-5 h-5" />}
            subtitle={
              latestRevenueEngine
                ? `Purchases: ${latestRevenueEngine.summary.purchases}`
                : "Refresh revenue engine"
            }
          />
          <AdminMetricCard
            label="Revenue Conv."
            value={latestRevenueEngine ? `${latestRevenueEngine.summary.conversionPct}%` : "--"}
            icon={<DollarSign className="w-5 h-5" />}
            subtitle={
              latestRevenueEngine
                ? `AOV: €${(latestRevenueEngine.summary.averageOrderValueCents / 100).toFixed(0)}`
                : "Refresh revenue engine"
            }
          />
          <AdminMetricCard
            label="Email Revenue"
            value={
              latestRevenueEngine
                ? `€${(latestRevenueEngine.summary.emailAttributedRevenueCents / 100).toFixed(0)}`
                : "--"
            }
            icon={<Mail className="w-5 h-5" />}
            subtitle={
              latestRevenueEngine
                ? `Purchases: ${latestRevenueEngine.summary.emailAttributedPurchases}`
                : "Refresh revenue engine"
            }
          />
          <AdminMetricCard
            label="Bridge -> Studio"
            value={latestRevenueEngine ? `${latestRevenueEngine.summary.bridgeToStudioRatePct}%` : "--"}
            icon={<Users className="w-5 h-5" />}
            subtitle={
              latestRevenueEngine
                ? `Users: ${latestRevenueEngine.summary.bridgeToStudioUsers}`
                : "Refresh revenue engine"
            }
          />
          <AdminMetricCard
            label="90D Applications"
            value={latestLaunch ? String(latestLaunchOps.applications90d) : "--"}
            icon={<Users className="w-5 h-5" />}
            subtitle={latestLaunch ? `Qualified: ${latestLaunchOps.qualified90d}` : "Run launch report"}
          />
          <AdminMetricCard
            label="90D Closed Won"
            value={latestLaunch ? String(latestLaunchOps.closedWon90d) : "--"}
            icon={<Users className="w-5 h-5" />}
            subtitle={latestLaunch ? `Offers sent: ${latestLaunchOps.offersSent90d}` : "Run launch report"}
          />
          <AdminMetricCard
            label="90D Cash"
            value={
              latestLaunch
                ? formatEuroFromCents(Number(latestLaunchOps.cashCollected90dCents || "0"))
                : "€--"
            }
            icon={<DollarSign className="w-5 h-5" />}
            subtitle={latestLaunch ? `Calls booked: ${latestLaunchOps.callsBooked90d}` : "Run launch report"}
          />
          <AdminMetricCard
            label="Membership Churn (30d)"
            value={latestLaunch ? `${latestLaunchOps.churn30dPct}%` : "--"}
            icon={<Users className="w-5 h-5" />}
            subtitle={
              latestLaunch
                ? `New: ${latestLaunchOps.newMemberships30d}, Churned: ${latestLaunchOps.churnedMemberships30d}`
                : "Run launch report"
            }
          />
          <AdminMetricCard
            label="TTFI Median (7d)"
            value={
              activationKpi?.metrics.medianTtfiMinutes !== null && activationKpi?.metrics.medianTtfiMinutes !== undefined
                ? `${activationKpi.metrics.medianTtfiMinutes}m`
                : "--"
            }
            icon={<Instagram className="w-5 h-5" />}
            subtitle={
              activationKpi
                ? `Completions: ${activationKpi.metrics.completes}`
                : "Refresh 7D TTFI KPI"
            }
          />
          <AdminMetricCard
            label="Activation <=5m"
            value={activationKpi ? `${activationKpi.rates.activation5mFromStartsPct}%` : "--"}
            icon={<Users className="w-5 h-5" />}
            subtitle={
              activationKpi
                ? `From starts: ${activationKpi.metrics.completesWithin5m}/${activationKpi.metrics.starts}`
                : "Refresh 7D TTFI KPI"
            }
          />
          <AdminMetricCard
            label="Activation <=60m"
            value={activationKpi ? `${activationKpi.rates.activation60mFromSignupsPct}%` : "--"}
            icon={<Users className="w-5 h-5" />}
            subtitle={
              activationKpi
                ? `From signups: ${activationKpi.metrics.completesWithin60m}/${activationKpi.metrics.newSignups}`
                : "Refresh 7D TTFI KPI"
            }
          />
          <AdminMetricCard
            label="Guide Completion"
            value={selfieGuideAnalytics ? `${selfieGuideAnalytics.rates.guideCompletionRate}%` : "--"}
            icon={<Users className="w-5 h-5" />}
            subtitle={
              selfieGuideAnalytics
                ? `${selfieGuideAnalytics.totals.guideCompleted}/${selfieGuideAnalytics.totals.buyers} buyers`
                : "Refresh Selfie Guide analytics"
            }
          />
          <AdminMetricCard
            label="Guide -> Studio"
            value={selfieGuideAnalytics ? `${selfieGuideAnalytics.rates.studioConversionRate}%` : "--"}
            icon={<DollarSign className="w-5 h-5" />}
            subtitle={
              selfieGuideAnalytics
                ? `${selfieGuideAnalytics.totals.studioConverted} converted`
                : "Refresh Selfie Guide analytics"
            }
          />
          <AdminMetricCard
            label="2026 Opt-ins"
            value={funnel2026 ? String(funnel2026.metrics.guideOptIns) : "--"}
            icon={<Users className="w-5 h-5" />}
            subtitle={funnel2026 ? `Access: ${funnel2026.rates.guideAccessFromOptInPct}%` : "Refresh 2026 funnel"}
          />
          <AdminMetricCard
            label="2026 Upsell Clicks"
            value={funnel2026 ? String(funnel2026.metrics.guideUpsellClicks) : "--"}
            icon={<Mail className="w-5 h-5" />}
            subtitle={funnel2026 ? `From access: ${funnel2026.rates.upsellClickFromGuideAccessPct}%` : "Refresh 2026 funnel"}
          />
          <AdminMetricCard
            label="2026 Purchases"
            value={funnel2026 ? String(funnel2026.metrics.purchases) : "--"}
            icon={<DollarSign className="w-5 h-5" />}
            subtitle={funnel2026 ? `Checkout conv: ${funnel2026.rates.purchaseFromCheckoutStartPct}%` : "Refresh 2026 funnel"}
          />
          <AdminMetricCard
            label="Buyer Returns"
            value={funnel2026 ? `${funnel2026.rates.academyReturnFromPurchasePct}%` : "--"}
            icon={<Users className="w-5 h-5" />}
            subtitle={funnel2026 ? `Academy opens: ${funnel2026.metrics.academyHomeOpened}` : "Refresh 2026 funnel"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="bg-white border border-stone-200 p-6 rounded-none lg:col-span-2">
            <h2 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              2026 Funnel Snapshot
            </h2>
            {funnel2026 ? (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Activation Path</p>
                  {[
                    ["Guide opt-ins", funnel2026.metrics.guideOptIns],
                    ["Guide access opened", funnel2026.metrics.guideAccessOpened],
                    ["Guide upsell clicks", funnel2026.metrics.guideUpsellClicks],
                    ["Checkout starts", funnel2026.metrics.checkoutStarts],
                    ["Purchases", funnel2026.metrics.purchases],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between border-b border-stone-100 pb-2 text-xs text-stone-700">
                      <span>{label}</span>
                      <span className="font-mono text-[11px]">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Access Opened</p>
                  {[
                    ["Starter Kit", funnel2026.metrics.starterKitAccessOpened],
                    ["Brand Strategy", funnel2026.metrics.brandStrategyAccessOpened],
                    ["Academy Home", funnel2026.metrics.academyHomeOpened],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between border-b border-stone-100 pb-2 text-xs text-stone-700">
                      <span>{label}</span>
                      <span className="font-mono text-[11px]">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Purchases By Offer</p>
                  {funnel2026.offerPurchases.map((offer) => (
                    <div key={offer.product} className="flex items-center justify-between border-b border-stone-100 pb-2 text-xs text-stone-700">
                      <span>{offer.product.replace(/_/g, " ")}</span>
                      <span className="font-mono text-[11px]">{offer.purchases}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-600">Refresh 2026 funnel to populate this section.</p>
            )}
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none lg:col-span-2">
            <h2 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              Revenue Engine
            </h2>
            {latestRevenueEngine ? (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Top Offers</p>
                  {latestRevenueEngine.offers.slice(0, 5).map((offer) => (
                    <div key={`${offer.offerSlug}-${offer.funnelStage}`} className="flex items-center justify-between border-b border-stone-100 pb-2 text-xs text-stone-700">
                      <div>
                        <p className="font-medium">{offer.offerSlug}</p>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500">{offer.funnelStage}</p>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <p>{offer.purchases}/{offer.sessions}</p>
                        <p>{offer.conversionPct}%</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Top Channels</p>
                  {latestRevenueEngine.channels.slice(0, 5).map((channel) => (
                    <div key={`${channel.utmSource}-${channel.utmMedium}-${channel.utmCampaign}`} className="flex items-center justify-between border-b border-stone-100 pb-2 text-xs text-stone-700">
                      <div>
                        <p className="font-medium">{channel.utmSource} / {channel.utmMedium}</p>
                        <p className="text-[10px] text-stone-500">{channel.utmCampaign}</p>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <p>{channel.purchases}/{channel.sessions}</p>
                        <p>€{(channel.revenueCents / 100).toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Lifecycle + Referral</p>
                  <div className="border-b border-stone-100 pb-3 text-xs text-stone-700">
                    <p className="font-medium">Referral loop</p>
                    <p>Signups: {latestRevenueEngine.referrals.signups}</p>
                    <p>Completed: {latestRevenueEngine.referrals.completed}</p>
                    <p>Influenced purchases: {latestRevenueEngine.referrals.influencedPurchases}</p>
                    <p>Influenced revenue: €{(latestRevenueEngine.referrals.influencedRevenueCents / 100).toFixed(0)}</p>
                  </div>
                  {latestRevenueEngine.lifecycle.slice(0, 4).map((campaign) => (
                    <div key={`${campaign.campaignId ?? "none"}-${campaign.utmCampaign}`} className="flex items-center justify-between border-b border-stone-100 pb-2 text-xs text-stone-700">
                      <div>
                        <p className="font-medium">{campaign.utmCampaign}</p>
                        <p className="text-[10px] text-stone-500">Campaign ID: {campaign.campaignId ?? "n/a"}</p>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <p>{campaign.purchases} purchases</p>
                        <p>€{(campaign.revenueCents / 100).toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-1 text-xs text-stone-700">
                    <p className="font-medium">Biggest drop-offs</p>
                    <p>{latestRevenueEngine.topDropoffs.map((item) => `${item.offerSlug} (${item.dropoffCount})`).join(", ") || "None"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-600">Refresh the revenue engine report to populate this section.</p>
            )}
          </div>

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

        <div className="bg-white border border-stone-200 p-6 rounded-none mb-10">
          <h2 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
            Selfie Guide Funnel
          </h2>
          {selfieGuideAnalytics ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <AdminMetricCard
                  label="Guide Buyers"
                  value={String(selfieGuideAnalytics.totals.buyers)}
                  subtitle={`Opened: ${selfieGuideAnalytics.totals.guideOpened}`}
                />
                <AdminMetricCard
                  label="Guide Open Rate"
                  value={`${selfieGuideAnalytics.rates.guideOpenRate}%`}
                  subtitle="Opened / buyers"
                />
                <AdminMetricCard
                  label="Guide Completed"
                  value={String(selfieGuideAnalytics.totals.guideCompleted)}
                  subtitle={`${selfieGuideAnalytics.rates.guideCompletionRate}%`}
                />
                <AdminMetricCard
                  label="Challenge Completed"
                  value={String(selfieGuideAnalytics.totals.challengeCompleted)}
                  subtitle={`${selfieGuideAnalytics.rates.challengeCompletionRate}%`}
                />
                <AdminMetricCard
                  label="Studio Converted"
                  value={String(selfieGuideAnalytics.totals.studioConverted)}
                  subtitle={`${selfieGuideAnalytics.rates.studioConversionRate}%`}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] tracking-[0.12em] uppercase text-stone-500 border-b border-stone-200">
                      <th className="text-left py-2 pr-3">Chapter</th>
                      <th className="text-right py-2 px-2">Reached</th>
                      <th className="text-right py-2 px-2">Drop-off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selfieGuideAnalytics.chapterFunnel.map((row) => (
                      <tr key={row.chapter} className="border-b border-stone-100 text-stone-700">
                        <td className="py-2 pr-3 font-mono text-[11px]">Chapter {row.chapter}</td>
                        <td className="py-2 px-2 text-right font-mono text-[11px]">{row.reached}</td>
                        <td className="py-2 px-2 text-right font-mono text-[11px]">{row.dropOffFromPrevious}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-600">Refresh Selfie Guide analytics to populate this section.</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              Conversion Ops (90D Plan)
            </h2>
            {latestLaunch ? (
              <div className="space-y-2 text-xs text-stone-700">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Applications</span>
                  <span className="font-mono text-[11px]">{latestLaunchOps.applications90d}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Qualified</span>
                  <span className="font-mono text-[11px]">{latestLaunchOps.qualified90d}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Calls booked</span>
                  <span className="font-mono text-[11px]">{latestLaunchOps.callsBooked90d}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Offers sent</span>
                  <span className="font-mono text-[11px]">{latestLaunchOps.offersSent90d}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Closed won</span>
                  <span className="font-mono text-[11px]">{latestLaunchOps.closedWon90d}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Cash collected</span>
                  <span className="font-mono text-[11px]">
                    {formatEuroFromCents(Number(latestLaunchOps.cashCollected90dCents || "0"))}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">New memberships (30d)</span>
                  <span className="font-mono text-[11px]">{latestLaunchOps.newMemberships30d}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Churn (30d)</span>
                  <span className="font-mono text-[11px]">{latestLaunchOps.churn30dPct}%</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-600">Run the launch report to populate this section.</p>
            )}
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              ARPU / Churn Weekly Audit
            </h2>
            {latestArpu ? (
              <div className="space-y-2 text-xs text-stone-700">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Membership MRR</span>
                  <span className="font-mono text-[11px]">{formatEuroFromCents(latestArpu.metrics.membershipMrrCents)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Active memberships</span>
                  <span className="font-mono text-[11px]">{latestArpu.metrics.activeMemberships}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">ARPU</span>
                  <span className="font-mono text-[11px]">€{latestArpu.metrics.arpuEuro}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Discounted active</span>
                  <span className="font-mono text-[11px]">
                    {latestArpu.metrics.discountedMembershipsActive} ({latestArpu.metrics.discountedSharePct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Churn (30d)</span>
                  <span className="font-mono text-[11px]">{latestArpu.metrics.churn30dPct}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.12em] text-stone-500">Freeze guard</span>
                  <span className={`font-mono text-[11px] ${latestArpu.freezeGuard.freezeHolding ? "text-emerald-700" : "text-red-700"}`}>
                    {latestArpu.freezeGuard.discountedDeltaVsLastWeek >= 0 ? "+" : ""}
                    {latestArpu.freezeGuard.discountedDeltaVsLastWeek}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 pt-2">{latestArpu.freezeGuard.note}</p>
              </div>
            ) : (
              <p className="text-xs text-stone-600">Run the ARPU/churn report to populate this section.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-none mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              Cohort Delivery Load
            </h2>
            <button
              onClick={runDeliverySnapshotNow}
              disabled={isRunning.delivery}
              className="px-4 py-2 border border-stone-900 text-xs uppercase tracking-[0.15em] hover:bg-stone-900 hover:text-white transition-colors disabled:opacity-60 rounded-none"
            >
              {isRunning.delivery ? "Refreshing..." : "Refresh Snapshot"}
            </button>
          </div>

          {deliveryLatest ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <AdminMetricCard
                label="Live Hours (30d)"
                value={String(deliveryLatest.summary.liveHours30d)}
                subtitle={`Ratio: ${deliveryLatest.summary.liveRatio30dPct}%`}
              />
              <AdminMetricCard
                label="Async Hours (30d)"
                value={String(deliveryLatest.summary.asyncHours30d)}
                subtitle={`Ratio: ${deliveryLatest.summary.asyncRatio30dPct}%`}
              />
              <AdminMetricCard
                label="Total Hours (30d)"
                value={String(deliveryLatest.summary.totalHours30d)}
                subtitle="Live + Async"
              />
              <AdminMetricCard
                label="Async Target"
                value={deliveryLatest.summary.asyncTargetMet ? "On Track" : "Below 60%"}
                subtitle="Goal: >= 60% async"
              />
            </div>
          ) : (
            <p className="text-xs text-stone-600 mb-6">No delivery load data yet. Log your first block below.</p>
          )}

          <form onSubmit={submitDeliveryLog} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
            <select
              value={deliveryForm.mode}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, mode: e.target.value as "live" | "async" }))}
              className="bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none"
            >
              <option value="live">Live</option>
              <option value="async">Async</option>
            </select>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={deliveryForm.hours}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, hours: e.target.value }))}
              className="bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none"
              placeholder="Hours"
            />
            <input
              type="date"
              value={deliveryForm.sessionDate}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, sessionDate: e.target.value }))}
              className="bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none"
            />
            <input
              type="text"
              value={deliveryForm.cohortLabel}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, cohortLabel: e.target.value }))}
              className="bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none"
              placeholder="Cohort label (optional)"
            />
            <input
              type="text"
              value={deliveryForm.notes}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none"
              placeholder="Notes (optional)"
            />
            <button
              type="submit"
              disabled={isRunning.delivery}
              className="border border-stone-900 bg-stone-900 text-white px-3 py-2 text-xs uppercase tracking-[0.15em] hover:bg-stone-800 transition-colors disabled:opacity-60"
            >
              Log Block
            </button>
          </form>

          {deliveryLatest?.recentEntries?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] tracking-[0.12em] uppercase text-stone-500 border-b border-stone-200">
                    <th className="text-left py-2 pr-3">Date</th>
                    <th className="text-left py-2 px-2">Mode</th>
                    <th className="text-right py-2 px-2">Hours</th>
                    <th className="text-left py-2 px-2">Cohort</th>
                    <th className="text-left py-2 px-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryLatest.recentEntries.slice(0, 10).map((row) => (
                    <tr key={row.id} className="border-b border-stone-100 text-stone-700">
                      <td className="py-2 pr-3 font-mono text-[11px]">{row.sessionDate}</td>
                      <td className="py-2 px-2 uppercase tracking-[0.08em]">{row.mode}</td>
                      <td className="py-2 px-2 text-right font-mono text-[11px]">{row.hours}</td>
                      <td className="py-2 px-2">{row.cohortLabel || "-"}</td>
                      <td className="py-2 px-2">{row.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="bg-stone-950 text-white p-8 rounded-none text-center">
          <h3 className="font-['Times_New_Roman'] text-lg tracking-[0.15em] uppercase mb-3">
            NEXT ACTION
          </h3>
          <p className="text-sm text-stone-200 mb-6">
            Run launch + ARPU/churn weekly reports after each CTA wave, and log cohort delivery blocks daily to keep
            live hours under control.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/admin/funnel-cleanup"
              className="px-6 py-3 bg-white text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-200 transition-colors rounded-none"
            >
              Open Cleanup Review
            </Link>
            {/* removed in CLEANUP-01: /admin/marketing */}
          </div>
        </div>
      </div>
    </div>
  )
}
