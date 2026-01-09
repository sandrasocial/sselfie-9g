"use client"

import { useEffect, useState } from "react"
import {
  Mail,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  BarChart3,
  Calendar,
  Users,
  Download,
  RefreshCw,
  ArrowLeft,
  Instagram,
  ShoppingCart,
  CheckCircle,
} from "lucide-react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  ComposedChart,
} from "recharts"
import Link from "next/link"
import { AdminLoadingState, AdminErrorState } from "@/components/admin/shared"

interface ConversionData {
  emailFunnel: {
    totalSubscribers: number
    emailsSentThisWeek: number
    clicksThisWeek: number
    checkoutsStarted: number
    purchasesCompleted: number
    conversionRate: number
    funnelData: Array<{
      stage: string
      count: number
      percentage: number
    }>
  }
  instagramFunnel: {
    instagramClicks: number
    freeGuideDownloads: number
    guideToPurchaseRate: number
    guideConversions: number
  }
  topCampaigns: Array<{
    id: number
    campaignName: string
    campaignType: string
    subjectLine: string
    createdAt: string
    metrics: {
      sent: number
      opened: number
      clicked: number
      converted: number
      conversionRate: number
      revenue: number
    }
  }>
  weeklyPerformance: {
    revenue: number
    newCustomers: number
    averageOrderValue: number
    topTrafficSource: string
  }
  funnelTrends: Array<{
    date: string
    emailsSent: number
    emailsOpened: number
    emailsClicked: number
    conversions: number
  }>
}

export default function ConversionsPage() {
  const [data, setData] = useState<ConversionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const response = await fetch("/api/admin/conversions")
      if (response.ok) {
        const conversionData = await response.json()
        setData(conversionData)
        setError(null)
      } else {
        setError("Failed to fetch conversion data")
      }
    } catch (err) {
      setError("Error loading conversion data")
      console.error("[v0] Error fetching conversion data:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const exportToCSV = () => {
    if (!data) return

    const csvRows = [
      ["Metric", "Value"],
      ["Total Subscribers", data.emailFunnel.totalSubscribers],
      ["Emails Sent (Week)", data.emailFunnel.emailsSentThisWeek],
      ["Clicks (Week)", data.emailFunnel.clicksThisWeek],
      ["Checkouts Started", data.emailFunnel.checkoutsStarted],
      ["Purchases Completed", data.emailFunnel.purchasesCompleted],
      ["Conversion Rate", `${data.emailFunnel.conversionRate}%`],
      ["Guide Downloads", data.instagramFunnel.freeGuideDownloads],
      ["Guide → Purchase Rate", `${data.instagramFunnel.guideToPurchaseRate}%`],
      ["Revenue (Week)", `$${data.weeklyPerformance.revenue.toFixed(2)}`],
      ["New Customers (Week)", data.weeklyPerformance.newCustomers],
      ["Average Order Value", `$${data.weeklyPerformance.averageOrderValue.toFixed(2)}`],
    ]

    const csvContent = csvRows.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `conversion-metrics-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return <AdminLoadingState message="Loading conversion metrics..." />
  }

  if (error || !data) {
    return (
      <AdminErrorState
        title="Conversion Data Unavailable"
        message={error || "Failed to load conversion data"}
        onRetry={fetchData}
        suggestions={[
          "Check your internet connection",
          "Verify the API endpoint is responding",
          "Try refreshing the page",
        ]}
      />
    )
  }

  const { emailFunnel, instagramFunnel, topCampaigns, weeklyPerformance, funnelTrends } = data

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-stone-600 hover:text-stone-950 transition-colors"
                aria-label="Go back to admin dashboard"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </Link>
              <h1 className="text-3xl font-serif font-light tracking-wide text-stone-950">
                Conversion Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={refreshing}
                className="px-4 py-2 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                aria-label={refreshing ? "Refreshing data" : "Refresh conversion data"}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm flex items-center gap-2"
                aria-label="Export conversion metrics to CSV file"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Export CSV
              </button>
            </div>
          </div>
          <p className="text-stone-600">Comprehensive conversion funnel metrics and performance analytics</p>
        </div>

        {/* Section 1: Email → Purchase Funnel */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-stone-200">
          <h2 className="text-xl font-serif font-light mb-6 text-stone-950 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email → Purchase Funnel
          </h2>

          {/* Funnel Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {emailFunnel.funnelData.map((stage, index) => (
              <div key={stage.stage} className="text-center">
                <div className="text-2xl font-serif font-light text-stone-950 mb-1">
                  {stage.count.toLocaleString()}
                </div>
                <div className="text-xs text-stone-600 uppercase tracking-wide">{stage.stage}</div>
                {index > 0 && (
                  <div className="text-xs text-stone-500 mt-1">
                    {stage.percentage.toFixed(1)}% of previous
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Funnel Visualization */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-stone-700 mb-4">Funnel Flow</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={emailFunnel.funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="stage" stroke="#78716c" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#78716c" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e7e5e4", borderRadius: "8px" }}
                />
                <Bar dataKey="count" fill="#78716c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Total Subscribers"
              value={emailFunnel.totalSubscribers.toLocaleString()}
              icon={<Users className="w-5 h-5" />}
            />
            <MetricCard
              label="Overall Conversion Rate"
              value={`${emailFunnel.conversionRate.toFixed(2)}%`}
              icon={<TrendingUp className="w-5 h-5" />}
              highlight
            />
            <MetricCard
              label="Emails Sent (Week)"
              value={emailFunnel.emailsSentThisWeek.toLocaleString()}
              icon={<Mail className="w-5 h-5" />}
            />
          </div>
        </div>

        {/* Section 2: Instagram → Email Funnel */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-stone-200">
          <h2 className="text-xl font-serif font-light mb-6 text-stone-950 flex items-center gap-2">
            <Instagram className="w-5 h-5" />
            Instagram → Email Funnel
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              label="Free Guide Downloads"
              value={instagramFunnel.freeGuideDownloads.toLocaleString()}
              icon={<Download className="w-5 h-5" />}
            />
            <MetricCard
              label="Guide → Purchase Rate"
              value={`${instagramFunnel.guideToPurchaseRate.toFixed(2)}%`}
              icon={<TrendingUp className="w-5 h-5" />}
              highlight
            />
            <MetricCard
              label="Guide Conversions"
              value={instagramFunnel.guideConversions.toLocaleString()}
              icon={<CheckCircle className="w-5 h-5" />}
            />
          </div>
        </div>

        {/* Section 3: Top Converting Campaigns */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-stone-200">
          <h2 className="text-xl font-serif font-light mb-6 text-stone-950 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Top Converting Campaigns
          </h2>

          {topCampaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-stone-600">Campaign</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Sent</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Opened</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Clicked</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Converted</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Conversion Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-stone-950">{campaign.campaignName}</div>
                          <div className="text-xs text-stone-500">{campaign.subjectLine}</div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-stone-700">
                        {campaign.metrics.sent.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4 text-stone-700">
                        {campaign.metrics.opened.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4 text-stone-700">
                        {campaign.metrics.clicked.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4 text-green-600 font-medium">
                        {campaign.metrics.converted.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-medium text-stone-950">
                          {campaign.metrics.conversionRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 text-green-600 font-medium">
                        ${campaign.metrics.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-stone-500 text-center py-8">No campaign data available yet</p>
          )}
        </div>

        {/* Section 4: This Week's Performance */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-stone-200">
          <h2 className="text-xl font-serif font-light mb-6 text-stone-950 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            This Week's Performance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              label="Revenue"
              value={`$${weeklyPerformance.revenue.toFixed(2)}`}
              icon={<DollarSign className="w-5 h-5" />}
              highlight
            />
            <MetricCard
              label="New Customers"
              value={weeklyPerformance.newCustomers.toLocaleString()}
              icon={<Users className="w-5 h-5" />}
            />
            <MetricCard
              label="Average Order Value"
              value={`$${weeklyPerformance.averageOrderValue.toFixed(2)}`}
              icon={<ShoppingCart className="w-5 h-5" />}
            />
            <MetricCard
              label="Top Traffic Source"
              value={weeklyPerformance.topTrafficSource}
              icon={<TrendingUp className="w-5 h-5" />}
            />
          </div>
        </div>

        {/* Funnel Trends Chart */}
        {funnelTrends.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
            <h2 className="text-xl font-serif font-light mb-6 text-stone-950">Funnel Trends (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={funnelTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis
                  dataKey="date"
                  stroke="#78716c"
                  tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
                <YAxis stroke="#78716c" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e7e5e4", borderRadius: "8px" }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="emailsSent"
                  fill="#78716c"
                  fillOpacity={0.2}
                  stroke="#78716c"
                  name="Emails Sent"
                />
                <Line
                  type="monotone"
                  dataKey="emailsOpened"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  name="Opened"
                />
                <Line
                  type="monotone"
                  dataKey="emailsClicked"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Clicked"
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Conversions"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-6 border ${
        highlight
          ? "bg-gradient-to-br from-stone-950 to-stone-800 border-stone-700 text-white"
          : "bg-white border-stone-200"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={highlight ? "text-white/70" : "text-stone-600"}>{icon}</div>
        {highlight && <TrendingUp className="w-4 h-4 text-green-400" />}
      </div>
      <div className={`text-2xl font-serif font-light mb-1 ${highlight ? "text-white" : "text-stone-950"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className={`text-xs tracking-[0.2em] uppercase ${highlight ? "text-stone-300" : "text-stone-500"}`}>
        {label}
      </div>
    </div>
  )
}
