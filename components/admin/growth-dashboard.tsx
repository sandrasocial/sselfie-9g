"use client"

import { useState } from "react"
import useSWR from "swr"
import { RefreshCw, Download, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { AdminNav } from "./admin-nav"
import { ForecastSection } from "./forecast-section"

// Constants for display
const COST_PER_CREDIT = 0.15
const REFERRAL_BONUS_COST = 11.25

interface GrowthDashboardData {
  summary: {
    revenue: number
    creditCost: number
    referralCost: number
    claudeCost: number
    totalCosts: number
    grossMargin: number
  }
  metrics: {
    activeUsers: number
    mrr: number
    totalUsers: number
    activeSubscriptions: number
    referralConversionRate: number
    avgCreditUsage: number
    avgClaudeCost: number
    arpu: number
    referralROI: number
  }
  credits: {
    totalIssued: number
    totalSpent: number
    bonusCredits: number
    avgUsagePerActiveUser: number
  }
  referrals: {
    total: number
    completed: number
    conversionRate: number
    bonusCost: number
    revenuePotential: number
    roi: number
  }
  email: {
    totalSends: number
    upsellEmails: number
  }
  automation: {
    milestoneBonuses: boolean
    referralBonuses: boolean
    creditGifts: boolean
  }
  timestamp: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format percentage
 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Export data to CSV
 */
function exportToCSV(data: GrowthDashboardData) {
  const rows = [
    ["Metric", "Value"],
    ["Total Revenue (USD)", formatCurrency(data.summary.revenue)],
    ["Credit Cost (USD)", formatCurrency(data.summary.creditCost)],
    ["Referral Cost (USD)", formatCurrency(data.summary.referralCost)],
    ["Claude Cost (USD)", formatCurrency(data.summary.claudeCost)],
    ["Total Costs (USD)", formatCurrency(data.summary.totalCosts)],
    ["Gross Margin (%)", formatPercent(data.summary.grossMargin)],
    ["", ""],
    ["Active Users", data.metrics.activeUsers.toString()],
    ["Total Users", data.metrics.totalUsers.toString()],
    ["MRR (USD)", formatCurrency(data.metrics.mrr)],
    ["Active Subscriptions", data.metrics.activeSubscriptions.toString()],
    ["ARPU (USD)", formatCurrency(data.metrics.arpu)],
    ["", ""],
    ["Total Credits Issued", data.credits.totalIssued.toString()],
    ["Total Credits Spent", data.credits.totalSpent.toString()],
    ["Bonus Credits", data.credits.bonusCredits.toString()],
    ["Avg Credit Usage", data.credits.avgUsagePerActiveUser.toString()],
    ["", ""],
    ["Total Referrals", data.referrals.total.toString()],
    ["Completed Referrals", data.referrals.completed.toString()],
    ["Referral Conversion Rate (%)", formatPercent(data.referrals.conversionRate)],
    ["Referral ROI (%)", formatPercent(data.referrals.roi)],
    ["", ""],
    ["Total Email Sends", data.email.totalSends.toString()],
    ["Upsell Emails", data.email.upsellEmails.toString()],
    ["", ""],
    ["Milestone Bonuses Enabled", data.automation.milestoneBonuses ? "Yes" : "No"],
    ["Referral Bonuses Enabled", data.automation.referralBonuses ? "Yes" : "No"],
    ["Credit Gifts Enabled", data.automation.creditGifts ? "Yes" : "No"],
    ["", ""],
    ["Last Updated", new Date(data.timestamp).toLocaleString()],
  ]

  const csvContent = rows.map((row) => row.join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `growth-dashboard-${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Stat Card Component - Matches main admin dashboard style
 */
function StatCard({
  title,
  value,
  subtitle,
  trend,
  isPrimary = false,
}: {
  title: string
  value: string | number
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  isPrimary?: boolean
}) {
  const trendIcon =
    trend === "up" ? (
      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
    ) : trend === "down" ? (
      <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
    ) : null

  if (isPrimary) {
    return (
      <div className="bg-stone-950 text-white p-4 sm:p-6 lg:p-8 rounded-none">
        <div className="flex items-start justify-between mb-1 sm:mb-2">
          <p className="text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-300">
            {title}
          </p>
          {trend && trendIcon}
        </div>
        <p className="text-2xl sm:text-3xl lg:text-4xl font-['Times_New_Roman'] font-extralight mb-1 sm:mb-2">
          {value}
        </p>
        {subtitle && <p className="text-[8px] text-stone-400 mt-1">{subtitle}</p>}
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 p-4 sm:p-6 lg:p-8 rounded-none">
      <div className="flex items-start justify-between mb-1 sm:mb-2">
        <p className="text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-400">
          {title}
        </p>
        {trend && trendIcon}
      </div>
      <p className="text-2xl sm:text-3xl lg:text-4xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1 sm:mb-2">
        {value}
      </p>
      {subtitle && <p className="text-[8px] sm:text-[10px] text-stone-400 mt-1">{subtitle}</p>}
    </div>
  )
}

/**
 * Automation Status Badge
 */
function AutomationBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${enabled ? "bg-green-500" : "bg-stone-300"}`}
        aria-label={enabled ? "Enabled" : "Disabled"}
      />
      <span className={`text-[10px] sm:text-xs tracking-[0.1em] uppercase ${enabled ? "text-stone-950" : "text-stone-400"}`}>
        {label}
      </span>
    </div>
  )
}

export function GrowthDashboard() {
  const { data, error, isLoading, mutate } = useSWR<GrowthDashboardData>(
    "/api/admin/growth-dashboard",
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
    },
  )

  const [isExporting, setIsExporting] = useState(false)

  const handleRefresh = () => {
    mutate()
  }

  const handleExport = () => {
    if (!data) return
    setIsExporting(true)
    try {
      exportToCSV(data)
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setIsExporting(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
            <p className="text-stone-950">Error loading dashboard data</p>
            <p className="text-stone-400 text-sm mt-2">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
            <p className="text-stone-950">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 mb-2 tracking-[0.1em] uppercase">
                Growth Dashboard
              </h1>
              <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase">
                Last updated: {new Date(data.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs tracking-[0.1em] uppercase border border-stone-200 bg-white text-stone-950 hover:bg-stone-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || !data}
                className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs tracking-[0.1em] uppercase border border-stone-200 bg-white text-stone-950 hover:bg-stone-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Revenue Overview */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 mb-4 sm:mb-6 tracking-[0.1em] uppercase">
            Revenue Overview
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <StatCard title="Total Revenue" value={formatCurrency(data.summary.revenue)} isPrimary />
            <StatCard title="Monthly Recurring Revenue" value={formatCurrency(data.metrics.mrr)} />
            <StatCard title="Average Revenue Per User" value={formatCurrency(data.metrics.arpu)} />
          </div>
        </section>

        {/* Credit Economics */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 mb-4 sm:mb-6 tracking-[0.1em] uppercase">
            Credit Economics
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard title="Total Credits Issued" value={data.credits.totalIssued.toLocaleString()} />
            <StatCard title="Total Credits Spent" value={data.credits.totalSpent.toLocaleString()} />
            <StatCard
              title="Credit Cost (USD)"
              value={formatCurrency(data.summary.creditCost)}
              subtitle={`${data.credits.totalSpent.toLocaleString()} credits × $${COST_PER_CREDIT.toFixed(2)}`}
            />
            <StatCard
              title="Avg Usage Per Active User"
              value={data.credits.avgUsagePerActiveUser.toFixed(1)}
              subtitle="credits"
            />
          </div>
        </section>

        {/* Referral Performance */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 mb-4 sm:mb-6 tracking-[0.1em] uppercase">
            Referral Performance
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard title="Total Referrals" value={data.referrals.total} />
            <StatCard
              title="Completed Referrals"
              value={data.referrals.completed}
              subtitle={`${formatPercent(data.referrals.conversionRate)} conversion rate`}
            />
            <StatCard
              title="Referral Bonus Cost"
              value={formatCurrency(data.referrals.bonusCost)}
              subtitle={`${data.referrals.completed} × $${REFERRAL_BONUS_COST.toFixed(2)}`}
            />
            <StatCard
              title="Referral ROI"
              value={formatPercent(data.referrals.roi)}
              subtitle={`Revenue potential: ${formatCurrency(data.referrals.revenuePotential)}`}
              trend={data.referrals.roi > 0 ? "up" : "neutral"}
            />
          </div>
        </section>

        {/* Forecast Section - Below Margin Health */}
        <section className="mb-8 sm:mb-12">
          <ForecastSection />
        </section>

        {/* Margin Health */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 mb-4 sm:mb-6 tracking-[0.1em] uppercase">
            Margin Health
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Gross Margin"
              value={formatPercent(data.summary.grossMargin)}
              subtitle={`${formatCurrency(data.summary.revenue)} revenue - ${formatCurrency(data.summary.totalCosts)} costs`}
              trend={data.summary.grossMargin >= 30 ? "up" : data.summary.grossMargin >= 20 ? "neutral" : "down"}
              isPrimary
            />
            <StatCard
              title="Total Costs"
              value={formatCurrency(data.summary.totalCosts)}
              subtitle="Credit + Referral + Claude"
            />
            <StatCard title="Claude API Cost" value={formatCurrency(data.summary.claudeCost)} subtitle="Estimated" />
            <StatCard
              title="Net Profit"
              value={formatCurrency(data.summary.revenue - data.summary.totalCosts)}
              subtitle="Revenue - Total Costs"
              trend={data.summary.revenue > data.summary.totalCosts ? "up" : "down"}
            />
          </div>
        </section>

        {/* User Metrics */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 mb-4 sm:mb-6 tracking-[0.1em] uppercase">
            User Metrics
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard title="Total Users" value={data.metrics.totalUsers.toLocaleString()} />
            <StatCard
              title="Active Users (30d)"
              value={data.metrics.activeUsers.toLocaleString()}
              subtitle={`${formatPercent((data.metrics.activeUsers / data.metrics.totalUsers) * 100)} of total`}
            />
            <StatCard title="Active Subscriptions" value={data.metrics.activeSubscriptions} />
            <StatCard
              title="Avg Claude Cost/User"
              value={formatCurrency(data.metrics.avgClaudeCost)}
              subtitle="Per month"
            />
          </div>
        </section>

        {/* Automation Status */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 mb-4 sm:mb-6 tracking-[0.1em] uppercase">
            Automation Status
          </h2>
          <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AutomationBadge enabled={data.automation.milestoneBonuses} label="Milestone Bonuses" />
              <AutomationBadge enabled={data.automation.referralBonuses} label="Referral Bonuses" />
              <AutomationBadge enabled={data.automation.creditGifts} label="Credit Gifts" />
            </div>
          </div>
        </section>

        {/* Email Metrics */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 mb-4 sm:mb-6 tracking-[0.1em] uppercase">
            Email Metrics
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <StatCard title="Total Email Sends" value={data.email.totalSends.toLocaleString()} />
            <StatCard title="Credit Exhaustion Signals (Upsell Emails)" value={data.email.upsellEmails.toLocaleString()} />
          </div>
        </section>
      </div>
    </div>
  )
}
