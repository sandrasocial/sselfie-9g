"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { generateAnalyticsInsights } from "@/agents/marketing/marketingAutomationAgent"

interface GlobalMetrics {
  totalEmailsSent: number
  openRate: number
  ctr: number
  bounceRate: number
  unsubscribeRate: number
}

interface Campaign {
  id: string
  name: string
  sent: number
  uniqueOpens: number
  ctr: number
  status: string
  lastSent: string
}

export default function AnalyticsPage() {
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [insights, setInsights] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      const [globalRes, campaignsRes, recommendationsRes] = await Promise.all([
        fetch("/api/analytics/global"),
        fetch("/api/analytics/campaigns"),
        fetch("/api/analytics/recommendations"),
      ])

      const globalData = await globalRes.json()
      const campaignsData = await campaignsRes.json()
      const recommendationsData = await recommendationsRes.json()

      setGlobalMetrics(globalData)
      setCampaigns(campaignsData.campaigns || [])
      setRecommendations(recommendationsData.recommendations || [])

      // Generate insights client-side (would normally be server-side)
      const insightsResult = await generateAnalyticsInsights()
      if (insightsResult.success && insightsResult.insights) {
        setInsights(insightsResult.insights)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-['Times_New_Roman'] text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950">
              Analytics
            </h1>
            <p className="text-sm text-stone-600 mt-2">Email performance and engagement insights</p>
          </div>
          <Link
            href="/admin"
            className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors"
          >
            Back to Admin
          </Link>
        </div>

        {/* Card 1: Global Email Metrics */}
        <div className="bg-white rounded-2xl p-8 border border-stone-200">
          <h2 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
            Global Email Metrics
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <div className="text-sm text-stone-500 mb-1">Total Emails Sent</div>
              <div className="font-['Times_New_Roman'] text-3xl text-stone-950">
                {globalMetrics?.totalEmailsSent || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-stone-500 mb-1">Open Rate (Last 30 Days)</div>
              <div className="font-['Times_New_Roman'] text-3xl text-stone-950">{globalMetrics?.openRate || 0}%</div>
            </div>
            <div>
              <div className="text-sm text-stone-500 mb-1">Click-Through Rate (Last 30 Days)</div>
              <div className="font-['Times_New_Roman'] text-3xl text-stone-950">{globalMetrics?.ctr || 0}%</div>
            </div>
            <div>
              <div className="text-sm text-stone-500 mb-1">Bounce Rate (All Time)</div>
              <div className="font-['Times_New_Roman'] text-3xl text-stone-950">{globalMetrics?.bounceRate || 0}%</div>
            </div>
            <div>
              <div className="text-sm text-stone-500 mb-1">Unsubscribe Rate (All Time)</div>
              <div className="font-['Times_New_Roman'] text-3xl text-stone-950">
                {globalMetrics?.unsubscribeRate || 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Recent Campaigns */}
        <div className="bg-white rounded-2xl p-8 border border-stone-200">
          <h2 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
            Recent Campaigns
          </h2>
          {campaigns.length === 0 ? (
            <p className="text-stone-500 text-sm">No campaigns found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left pb-3 text-xs uppercase tracking-wider text-stone-600 font-normal">
                      Campaign / Sequence
                    </th>
                    <th className="text-right pb-3 text-xs uppercase tracking-wider text-stone-600 font-normal">
                      Sent
                    </th>
                    <th className="text-right pb-3 text-xs uppercase tracking-wider text-stone-600 font-normal">
                      Unique Opens
                    </th>
                    <th className="text-right pb-3 text-xs uppercase tracking-wider text-stone-600 font-normal">CTR</th>
                    <th className="text-right pb-3 text-xs uppercase tracking-wider text-stone-600 font-normal">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-3 text-sm text-stone-950">{campaign.name}</td>
                      <td className="py-3 text-sm text-stone-700 text-right">{campaign.sent}</td>
                      <td className="py-3 text-sm text-stone-700 text-right">{campaign.uniqueOpens}</td>
                      <td className="py-3 text-sm text-stone-700 text-right">{campaign.ctr}%</td>
                      <td className="py-3 text-sm text-stone-500 text-right capitalize">{campaign.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Card 3: Behavior Insights */}
        <div className="bg-white rounded-2xl p-8 border border-stone-200">
          <h2 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
            Behavior Insights
          </h2>
          {insights.length === 0 ? (
            <p className="text-stone-500 text-sm">No insights available yet</p>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="text-sm text-stone-700 leading-relaxed">
                  {insight}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="bg-white rounded-2xl p-8 border border-stone-200">
            <h2 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
              System Recommendations
            </h2>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="text-sm text-stone-700 leading-relaxed pl-4 border-l-2 border-stone-300">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
