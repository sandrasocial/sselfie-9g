"use client"

import { useEffect, useState } from "react"

interface APAStats {
  totalDecisions: number
  totalOffers: number
  distribution: { offer_type: string; count: number }[]
  estimatedCTR: number
}

/**
 * Part 8 - APA Analytics Card for Admin Dashboard
 * Clean, minimal design matching SSELFIE aesthetic
 */
export function APAInsightsCard() {
  const [stats, setStats] = useState<APAStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/apa-stats")
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error("Error fetching APA stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg">
        <p className="text-sm text-stone-400">Loading APA insights...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg">
        <p className="text-sm text-stone-400">No APA data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg">
      <h3 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-6">
        APA INSIGHTS
      </h3>

      <div className="space-y-6">
        {/* Total Decisions */}
        <div className="flex items-center justify-between py-3 border-b border-stone-100">
          <span className="text-sm text-stone-600">Decisions This Week</span>
          <span className="text-3xl font-['Times_New_Roman'] font-extralight text-stone-950">
            {stats.totalDecisions}
          </span>
        </div>

        {/* Total Offers Sent */}
        <div className="flex items-center justify-between py-3 border-b border-stone-100">
          <span className="text-sm text-stone-600">Offers Sent</span>
          <span className="text-3xl font-['Times_New_Roman'] font-extralight text-stone-950">{stats.totalOffers}</span>
        </div>

        {/* Offer Distribution */}
        <div className="space-y-2">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-500 mb-3">Offer Type Distribution</p>
          {stats.distribution.map((item) => (
            <div key={item.offer_type} className="flex items-center justify-between py-2">
              <span className="text-sm text-stone-600 capitalize">{item.offer_type}</span>
              <span className="text-lg font-['Times_New_Roman'] font-extralight text-stone-950">{item.count}</span>
            </div>
          ))}
        </div>

        {/* Estimated CTR */}
        <div className="flex items-center justify-between py-3 border-t border-stone-100 mt-4">
          <span className="text-sm text-stone-600">Est. Click-Through</span>
          <span className="text-3xl font-['Times_New_Roman'] font-extralight text-stone-950">
            {(stats.estimatedCTR * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  )
}
