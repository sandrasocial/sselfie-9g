"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, TrendingUp, Users } from "lucide-react"

interface BetaData {
  betaCount: number
  betaLimit: number
  remaining: number
  percentageFilled: number
  shouldUpdatePricing: boolean
  recentBetaUsers: Array<{
    email: string
    joinedAt: string
    plan: string
    status: string
  }>
}

export function BetaCountdown() {
  const [betaData, setBetaData] = useState<BetaData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBetaData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchBetaData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchBetaData = async () => {
    try {
      const response = await fetch("/api/admin/dashboard/beta-users")
      if (response.ok) {
        const data = await response.json()
        setBetaData(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching beta data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
        </div>
      </div>
    )
  }

  if (!betaData) return null

  const getStatusColor = () => {
    if (betaData.shouldUpdatePricing) return "text-stone-900"
    if (betaData.percentageFilled >= 75) return "text-stone-700"
    return "text-stone-600"
  }

  const getStatusBgColor = () => {
    if (betaData.shouldUpdatePricing) return "bg-stone-100 border-stone-300"
    if (betaData.percentageFilled >= 75) return "bg-stone-100 border-stone-200"
    return "bg-stone-50 border-stone-200"
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
          BETA PROGRAM
        </h2>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-stone-400" />
          <span className="text-xs tracking-wider uppercase text-stone-500">50% OFF</span>
        </div>
      </div>

      {betaData.shouldUpdatePricing && (
        <div className="mb-6 bg-stone-100 border border-stone-300 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-stone-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-stone-900 mb-1">Beta Limit Reached!</p>
            <p className="text-xs text-stone-700 leading-relaxed">
              You've reached 100 beta users. It's time to update pricing to regular rates in{" "}
              <code className="bg-stone-200 px-2 py-0.5 rounded text-xs">app/actions/landing-checkout.ts</code>
            </p>
          </div>
        </div>
      )}

      {/* Progress Section */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-5xl font-['Times_New_Roman'] font-extralight text-stone-950">
              {betaData.betaCount}
              <span className="text-2xl text-stone-400">/{betaData.betaLimit}</span>
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-500 mt-1">Beta Users</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-['Times_New_Roman'] font-extralight ${getStatusColor()}`}>
              {betaData.remaining}
            </p>
            <p className="text-xs tracking-wider uppercase text-stone-500">Remaining</p>
          </div>
        </div>

        <div className="relative h-3 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 transition-all duration-500 ${
              betaData.shouldUpdatePricing
                ? "bg-stone-700"
                : betaData.percentageFilled >= 75
                  ? "bg-stone-600"
                  : "bg-stone-500"
            }`}
            style={{ width: `${betaData.percentageFilled}%` }}
          />
        </div>
        <p className="text-xs text-stone-500 mt-2 text-right">{betaData.percentageFilled.toFixed(1)}% filled</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`rounded-xl p-4 border ${getStatusBgColor()}`}>
          <div className="flex items-center gap-2 mb-2">
            {betaData.shouldUpdatePricing ? (
              <AlertCircle className="w-4 h-4 text-stone-700" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-stone-600" />
            )}
            <p className="text-xs tracking-wider uppercase text-stone-600">Pricing Status</p>
          </div>
          <p className={`text-sm font-medium ${getStatusColor()}`}>
            {betaData.shouldUpdatePricing ? "Update Required" : "Beta Active"}
          </p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-stone-400" />
            <p className="text-xs tracking-wider uppercase text-stone-600">Current Rate</p>
          </div>
          <p className="text-sm font-medium text-stone-900">$24.50 / $49.50</p>
        </div>
      </div>

      {/* Recent Beta Users */}
      <div>
        <p className="text-xs tracking-[0.2em] uppercase text-stone-500 mb-3">Recent Beta Users</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {betaData.recentBetaUsers.map((user, index) => (
            <div key={index} className="flex items-center justify-between py-2 px-3 bg-stone-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-stone-900 truncate">{user.email}</p>
                <p className="text-xs text-stone-500">
                  {new Date(user.joinedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-600 capitalize">{user.plan}</span>
                <div className={`w-2 h-2 rounded-full ${user.status === "active" ? "bg-stone-700" : "bg-stone-300"}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      {betaData.shouldUpdatePricing && (
        <div className="mt-6 pt-6 border-t border-stone-200">
          <p className="text-xs tracking-wider uppercase text-stone-500 mb-2">Next Steps:</p>
          <ol className="text-xs text-stone-600 space-y-1 list-decimal list-inside">
            <li>
              Open <code className="bg-stone-100 px-1 py-0.5 rounded">app/actions/landing-checkout.ts</code>
            </li>
            <li>Remove the beta discount calculation (line ~50)</li>
            <li>
              Use regular pricing from <code className="bg-stone-100 px-1 py-0.5 rounded">lib/pricing.config.ts</code>
            </li>
            <li>Deploy changes to production</li>
          </ol>
        </div>
      )}
    </div>
  )
}
