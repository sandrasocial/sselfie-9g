"use client"

import { useEffect, useState } from "react"

interface IntentStats {
  signalsCaptured: number
  hotPercent: number
  warmPercent: number
  coldPercent: number
  conversionRate: number
  topSignalTypes: Array<{ type: string; count: number }>
}

export function BlueprintIntentOverviewCard() {
  const [stats, setStats] = useState<IntentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/blueprint-intent-stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data.stats)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Failed to load intent stats:", error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-1/2" />
          <div className="h-32 bg-stone-200 rounded" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg">
        <p className="text-stone-500">Unable to load intent statistics</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg">
      <h3 className="font-serif text-3xl font-light tracking-wide text-stone-950 mb-6">BLUEPRINT INTENT OVERVIEW</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Signals Captured */}
        <div className="text-center p-6 bg-stone-50 rounded-xl">
          <p className="text-4xl font-serif font-light text-stone-950 mb-2">{stats.signalsCaptured}</p>
          <p className="text-xs tracking-widest uppercase text-stone-500">Signals Captured (7 Days)</p>
        </div>

        {/* Hot / Warm / Cold */}
        <div className="text-center p-6 bg-stone-50 rounded-xl">
          <div className="flex justify-center items-baseline space-x-4 mb-2">
            <div>
              <span className="text-2xl font-serif font-light text-red-600">{stats.hotPercent}%</span>
              <span className="text-xs text-stone-400 ml-1">HOT</span>
            </div>
            <div>
              <span className="text-2xl font-serif font-light text-yellow-600">{stats.warmPercent}%</span>
              <span className="text-xs text-stone-400 ml-1">WARM</span>
            </div>
            <div>
              <span className="text-2xl font-serif font-light text-blue-600">{stats.coldPercent}%</span>
              <span className="text-xs text-stone-400 ml-1">COLD</span>
            </div>
          </div>
          <p className="text-xs tracking-widest uppercase text-stone-500">Readiness Distribution</p>
        </div>

        {/* Conversion Rate */}
        <div className="text-center p-6 bg-stone-50 rounded-xl">
          <p className="text-4xl font-serif font-light text-stone-950 mb-2">{stats.conversionRate}%</p>
          <p className="text-xs tracking-widest uppercase text-stone-500">Blueprint → Purchase</p>
        </div>
      </div>

      {/* Top Signal Types */}
      <div>
        <p className="text-xs tracking-widest uppercase text-stone-500 mb-4">TOP SIGNAL TYPES</p>
        <div className="space-y-2">
          {stats.topSignalTypes.map((signal) => (
            <div key={signal.type} className="flex items-center justify-between py-2 border-b border-stone-100">
              <span className="text-sm text-stone-700">{signal.type}</span>
              <span className="text-lg font-serif font-light text-stone-950">{signal.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
