"use client"

import { useEffect, useState } from "react"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { 
  Mail, 
  TrendingUp, 
  MousePointerClick, 
  DollarSign, 
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts"
import Link from "next/link"

const ADMIN_EMAIL = "ssa@ssasocial.com"

interface CampaignMetrics {
  id: number
  campaignName: string
  campaignType: string
  subjectLine: string
  status: string
  createdAt: string
  scheduledFor: string | null
  sentAt: string | null
  metrics: {
    totalRecipients: number
    totalSent: number
    totalFailed: number
    totalOpened: number
    totalClicked: number
    totalConverted: number
    openRate: number
    clickRate: number
    conversionRate: number
    clickToOpenRate: number
    clickToConversionRate: number
  }
}

interface EmailAnalyticsData {
  campaigns: CampaignMetrics[]
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
  revenueAttribution: Array<{
    campaign_id: number
    campaign_name: string
    converted_count: number
    total_revenue: number
  }>
  engagementTrends: Array<{
    date: string
    sent: number
    opened: number
    clicked: number
    converted: number
  }>
  topCampaigns: CampaignMetrics[]
}

export default function EmailAnalyticsPage() {
  const [data, setData] = useState<EmailAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/admin/email-analytics")
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
        setError(null)
      } else {
        setError("Failed to fetch analytics")
      }
    } catch (err) {
      setError("Error loading analytics")
      console.error("[v0] Error fetching email analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-stone-600 mx-auto mb-4" />
          <p className="text-stone-600">Loading email analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-stone-600">{error || "Failed to load analytics"}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-stone-950 text-white rounded-lg hover:bg-stone-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { campaigns, overallStats, revenueAttribution, engagementTrends, topCampaigns } = data

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-serif font-light tracking-wide text-stone-950">
              Email Analytics
            </h1>
            <Link
              href="/admin"
              className="text-sm text-stone-600 hover:text-stone-950 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <p className="text-stone-600">Campaign performance metrics and engagement analytics</p>
        </div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Mail className="w-5 h-5" />}
            label="Total Sent (30d)"
            value={overallStats.totalSent.toLocaleString()}
            subtitle={`${overallStats.openRate.toFixed(1)}% open rate`}
          />
          <StatCard
            icon={<MousePointerClick className="w-5 h-5" />}
            label="Total Clicks"
            value={overallStats.totalClicked.toLocaleString()}
            subtitle={`${overallStats.clickRate.toFixed(1)}% click rate`}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Total Conversions"
            value={overallStats.totalConverted.toLocaleString()}
            subtitle={`${overallStats.conversionRate.toFixed(1)}% conversion rate`}
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Delivered"
            value={overallStats.delivered.toLocaleString()}
            subtitle={`${overallStats.bounced} bounced, ${overallStats.complained} complaints`}
          />
        </div>

        {/* Engagement Trends Chart */}
        {engagementTrends.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-stone-200">
            <h2 className="text-xl font-serif font-light mb-4 text-stone-950">Engagement Trends (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={engagementTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis 
                  dataKey="date" 
                  stroke="#78716c"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#78716c" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Area type="monotone" dataKey="sent" stackId="1" stroke="#78716c" fill="#78716c" fillOpacity={0.3} name="Sent" />
                <Area type="monotone" dataKey="opened" stackId="2" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.3} name="Opened" />
                <Area type="monotone" dataKey="clicked" stackId="3" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Clicked" />
                <Area type="monotone" dataKey="converted" stackId="4" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Converted" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Campaigns */}
        {topCampaigns.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-stone-200">
            <h2 className="text-xl font-serif font-light mb-4 text-stone-950">Top Performing Campaigns</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-stone-600">Campaign</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Sent</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Open Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Click Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Conversion Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-stone-950">{campaign.campaignName}</div>
                          <div className="text-sm text-stone-500">{campaign.subjectLine}</div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-stone-700">{campaign.metrics.totalSent.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">
                        <span className="font-medium text-stone-950">{campaign.metrics.openRate.toFixed(1)}%</span>
                        <span className="text-xs text-stone-500 ml-1">({campaign.metrics.totalOpened})</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-medium text-stone-950">{campaign.metrics.clickRate.toFixed(1)}%</span>
                        <span className="text-xs text-stone-500 ml-1">({campaign.metrics.totalClicked})</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-medium text-green-600">{campaign.metrics.conversionRate.toFixed(1)}%</span>
                        <span className="text-xs text-stone-500 ml-1">({campaign.metrics.totalConverted})</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <StatusBadge status={campaign.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Campaigns */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
          <h2 className="text-xl font-serif font-light mb-4 text-stone-950">All Campaigns</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-600">Campaign</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Sent</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Opened</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Clicked</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Converted</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Open Rate</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Click Rate</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-stone-950">{campaign.campaignName}</div>
                        <div className="text-xs text-stone-500">{campaign.campaignType}</div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-stone-700">{campaign.metrics.totalSent.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 text-stone-700">{campaign.metrics.totalOpened.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 text-stone-700">{campaign.metrics.totalClicked.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 text-green-600 font-medium">{campaign.metrics.totalConverted.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 text-stone-700">{campaign.metrics.openRate.toFixed(1)}%</td>
                    <td className="text-right py-3 px-4 text-stone-700">{campaign.metrics.clickRate.toFixed(1)}%</td>
                    <td className="text-right py-3 px-4">
                      <StatusBadge status={campaign.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, subtitle }: { icon: React.ReactNode; label: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
      <div className="flex items-center justify-between mb-2">
        <div className="text-stone-600">{icon}</div>
        <div className="text-2xl font-serif font-light text-stone-950">{value}</div>
      </div>
      <div className="text-sm font-medium text-stone-950">{label}</div>
      {subtitle && <div className="text-xs text-stone-500 mt-1">{subtitle}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    sent: { label: "Sent", className: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3 h-3" /> },
    scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700", icon: <Calendar className="w-3 h-3" /> },
    sending: { label: "Sending", className: "bg-yellow-100 text-yellow-700", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    draft: { label: "Draft", className: "bg-stone-100 text-stone-700", icon: <BarChart3 className="w-3 h-3" /> },
    failed: { label: "Failed", className: "bg-red-100 text-red-700", icon: <XCircle className="w-3 h-3" /> },
  }

  const config = statusConfig[status] || { label: status, className: "bg-stone-100 text-stone-700", icon: <AlertCircle className="w-3 h-3" /> }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

