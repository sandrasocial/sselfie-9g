"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Loader2, TrendingUp, Users, ArrowLeft, Settings, Download, Mail, BarChart3 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

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
  allBetaUsers: Array<{
    email: string
    joinedAt: string
    plan: string
    status: string
    revenue: number
  }>
}

export function BetaProgramManager() {
  const [betaData, setBetaData] = useState<BetaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

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

  const handleExportUsers = async () => {
    setExporting(true)
    try {
      // Create CSV data
      const csv = [
        ["Email", "Plan", "Status", "Joined Date", "Revenue"].join(","),
        ...(betaData?.allBetaUsers.map((user) =>
          [user.email, user.plan, user.status, user.joinedAt, `$${(user.revenue / 100).toFixed(2)}`].join(",")
        ) || []),
      ].join("\n")

      // Download CSV
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `beta-users-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success("Beta users exported successfully")
    } catch (error) {
      console.error("[v0] Error exporting users:", error)
      toast.error("Failed to export users")
    } finally {
      setExporting(false)
    }
  }

  const handleSendAnnouncementEmail = async () => {
    toast.info("Email feature coming soon")
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  const totalBetaRevenue =
    betaData?.allBetaUsers.reduce((sum, user) => sum + user.revenue, 0) || 0

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-950" />
      </div>
    )
  }

  if (!betaData) return null

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.3em] uppercase text-stone-950">
                BETA PROGRAM MANAGER
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportUsers} disabled={exporting}>
                <Download className="w-4 h-4 mr-2" />
                {exporting ? "Exporting..." : "Export Users"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendAnnouncementEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Alert Banner */}
        {betaData.shouldUpdatePricing && (
          <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-red-900 mb-2">Beta Limit Reached!</h3>
                <p className="text-sm text-red-800 leading-relaxed mb-4">
                  You&apos;ve reached the 100 beta user limit. It&apos;s time to disable the beta discount and switch to regular
                  pricing.
                </p>
                <div className="bg-white/60 rounded-xl p-4 border border-red-200">
                  <p className="text-xs tracking-wider uppercase text-red-700 mb-2 font-medium">Instructions:</p>
                  <ol className="text-sm text-red-900 space-y-2 list-decimal list-inside">
                    <li>
                      Set <code className="bg-red-100 px-2 py-1 rounded text-xs">ENABLE_BETA_DISCOUNT=false</code> in
                      environment variables
                    </li>
                    <li>Or update the discount logic in app/actions/landing-checkout.ts</li>
                    <li>Deploy changes to production</li>
                    <li>Verify that new signups use regular pricing</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-stone-950 to-stone-800 rounded-2xl p-6 border border-stone-700 shadow-xl">
            <Users className="w-8 h-8 text-white mb-4" />
            <p className="text-4xl font-['Times_New_Roman'] font-extralight text-white mb-2">
              {betaData.betaCount}
              <span className="text-xl text-stone-300">/{betaData.betaLimit}</span>
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-300">Beta Users</p>
            <p className="text-xs text-stone-400 mt-1">{betaData.percentageFilled.toFixed(1)}% filled</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xl">
            <TrendingUp className="w-8 h-8 text-stone-600 mb-4" />
            <p className="text-4xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
              {betaData.remaining}
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-500">Slots Remaining</p>
            <p className="text-xs text-stone-400 mt-1">
              {betaData.remaining === 0 ? "Program full" : "Still available"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xl">
            <BarChart3 className="w-8 h-8 text-stone-600 mb-4" />
            <p className="text-4xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
              {formatCurrency(totalBetaRevenue)}
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-500">Total Revenue</p>
            <p className="text-xs text-stone-400 mt-1">From beta users</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xl">
            <Settings className="w-8 h-8 text-stone-600 mb-4" />
            <p className="text-4xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">50%</p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-500">Discount Rate</p>
            <p className="text-xs text-stone-400 mt-1">Beta pricing</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-xl mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              PROGRAM PROGRESS
            </h3>
            <span className="text-sm text-stone-600">{betaData.percentageFilled.toFixed(1)}% Complete</span>
          </div>
          <div className="relative h-4 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                betaData.shouldUpdatePricing
                  ? "bg-red-600"
                  : betaData.percentageFilled >= 75
                    ? "bg-orange-500"
                    : "bg-stone-600"
              }`}
              style={{ width: `${betaData.percentageFilled}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-stone-500">
            <span>0 users</span>
            <span>50 users</span>
            <span>100 users</span>
          </div>
        </div>

        {/* Beta Users Table */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-stone-200">
            <h3 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              ALL BETA USERS
            </h3>
            <p className="text-sm text-stone-500 mt-1">Complete list of beta program participants</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-100">
                {betaData.allBetaUsers && betaData.allBetaUsers.length > 0 ? (
                  betaData.allBetaUsers.map((user, index) => (
                    <tr key={index} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs px-2 py-1 bg-stone-100 text-stone-700 rounded-full capitalize">
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-stone-300"}`}
                          />
                          <span className="text-sm text-stone-700 capitalize">{user.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {new Date(user.joinedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">
                        {formatCurrency(user.revenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-stone-500">
                      No beta users yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
