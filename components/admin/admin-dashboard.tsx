"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { SystemHealthMonitor } from "./system-health-monitor"
import { BetaCountdown } from "./beta-countdown"

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalCourses: number
  publishedCourses: number
  totalLessons: number
  totalChats: number
  totalKnowledge: number
  recentActivity: Array<{
    type: string
    description: string
    timestamp: string
  }>
}

interface RevenueData {
  mrr: number
  totalRevenue: number
  oneTimeRevenue: number
  subscriptionBreakdown: Array<{
    tier: string
    count: number
    revenue: number
  }>
  totalPurchases: number
  totalCreditsSold: number
  recentTransactions: Array<{
    amount: number
    type: string
    description: string
    userEmail: string
    timestamp: string
  }>
}

interface AdminDashboardProps {
  userId: string
  userName: string
}

export function AdminDashboard({ userId, userName }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenue, setRevenue] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
    fetchRevenueData()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/admin/dashboard/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching dashboard stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRevenueData = async () => {
    try {
      const response = await fetch("/api/admin/dashboard/revenue")
      if (response.ok) {
        const data = await response.json()
        setRevenue(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching revenue data:", error)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-950" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero Section */}
      <div className="relative h-[40vh] overflow-hidden">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/641-Yz6RWOHjtemWaGCwY5XQjtSCZX9LFH-E1PumsSpivkzYUKjuWvP4QaDz2DjyF.png"
          alt="Admin workspace"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-stone-50/50 to-stone-50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-['Times_New_Roman'] text-6xl md:text-8xl font-extralight tracking-[0.4em] uppercase text-stone-950 mb-4">
              ADMIN
            </h1>
            <p className="text-sm tracking-[0.3em] uppercase font-light text-stone-600">Welcome back, {userName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 -mt-20 relative z-10">
        {revenue && (
          <div className="mb-12 bg-gradient-to-br from-stone-950 to-stone-800 rounded-[1.75rem] overflow-hidden border border-stone-700 shadow-2xl">
            <div className="p-8 md:p-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-['Times_New_Roman'] text-3xl md:text-4xl font-extralight tracking-[0.3em] uppercase text-white">
                  REVENUE
                </h2>
                <p className="text-xs tracking-[0.2em] uppercase text-stone-400">Real-time data</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <p className="text-4xl md:text-5xl font-['Times_New_Roman'] font-extralight text-white mb-2">
                    {formatCurrency(revenue.totalRevenue)}
                  </p>
                  <p className="text-xs tracking-[0.2em] uppercase text-stone-300">Total Revenue</p>
                  <p className="text-xs text-stone-400 mt-1">All time earnings</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <p className="text-4xl md:text-5xl font-['Times_New_Roman'] font-extralight text-white mb-2">
                    {formatCurrency(revenue.mrr)}
                  </p>
                  <p className="text-xs tracking-[0.2em] uppercase text-stone-300">Monthly Recurring</p>
                  <p className="text-xs text-stone-400 mt-1">Active subscriptions</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <p className="text-4xl md:text-5xl font-['Times_New_Roman'] font-extralight text-white mb-2">
                    {formatCurrency(revenue.oneTimeRevenue)}
                  </p>
                  <p className="text-xs tracking-[0.2em] uppercase text-stone-300">One-Time Sales</p>
                  <p className="text-xs text-stone-400 mt-1">Last 30 days</p>
                </div>
              </div>

              {/* Subscription Breakdown */}
              {revenue.subscriptionBreakdown.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                  <p className="text-sm tracking-[0.2em] uppercase text-stone-300 mb-4">Subscription Breakdown</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {revenue.subscriptionBreakdown.map((sub) => (
                      <div key={sub.tier} className="flex items-center justify-between">
                        <div>
                          <p className="text-xs tracking-wider uppercase text-stone-400">{sub.tier}</p>
                          <p className="text-sm text-white">{sub.count} subscribers</p>
                        </div>
                        <p className="text-lg font-['Times_New_Roman'] font-extralight text-white">
                          {formatCurrency(sub.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-12">
          <BetaCountdown />
        </div>

        <div className="mb-12">
          <SystemHealthMonitor />
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
            <p className="text-4xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
              {stats?.totalUsers || 0}
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-500">Total Users</p>
            <p className="text-xs text-stone-400 mt-1">{stats?.activeUsers || 0} active this month</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
            <p className="text-4xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
              {stats?.totalCourses || 0}
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-500">Courses</p>
            <p className="text-xs text-stone-400 mt-1">{stats?.publishedCourses || 0} published</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
            <p className="text-4xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
              {stats?.totalChats || 0}
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-500">Agent Chats</p>
            <p className="text-xs text-stone-400 mt-1">AI conversations</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
            <p className="text-4xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
              {stats?.totalKnowledge || 0}
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-500">Knowledge Items</p>
            <p className="text-xs text-stone-400 mt-1">In knowledge base</p>
          </div>
        </div>

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Academy Card */}
          <Link href="/admin/academy" className="group">
            <div className="bg-white rounded-[1.75rem] overflow-hidden border border-stone-200 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/618-TVCuZVG8V6R2Bput7pX8V06bCHRXGx-TD03ySws0dHTOBOHA3nEypKB2ryX8K.png"
                  alt="Academy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.3em] uppercase text-white">
                    ACADEMY
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  Manage courses, lessons, and educational content for your community
                </p>
                <div className="flex gap-4 text-xs text-stone-500">
                  <span>{stats?.totalCourses || 0} courses</span>
                  <span>{stats?.totalLessons || 0} lessons</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Agent Card */}
          <Link href="/admin/agent" className="group">
            <div className="bg-white rounded-[1.75rem] overflow-hidden border border-stone-200 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/maya_68de145ae1rme0cs07ja9mcp90_0_1756673402614%20%281%29-v0JUZYIdnHyMNS5iYx5wGACaoJUT3R.png"
                  alt="AI Agent"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.3em] uppercase text-white">
                    AGENT
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  AI-powered content creation, strategy, and business intelligence
                </p>
                <div className="flex gap-4 text-xs text-stone-500">
                  <span>{stats?.totalChats || 0} conversations</span>
                  <span>Analytics & insights</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Feedback Card */}
          <Link href="/admin/feedback" className="group">
            <div className="bg-white rounded-[1.75rem] overflow-hidden border border-stone-200 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/616-nnePryg0hS2y745w8ZNU8TWvFrgude-Q2S6CSY6Sa2K2cy4vxgEMi0zyBBBIE.png"
                  alt="User Feedback"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.3em] uppercase text-white">
                    FEEDBACK
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  View user feedback, bug reports, feature requests, and testimonials
                </p>
                <div className="flex gap-4 text-xs text-stone-500">
                  <span>Real-time updates</span>
                  <span>Direct from users</span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Business Insights Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
            <h2 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
              RECENT ACTIVITY
            </h2>
            <div className="space-y-4">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4 pb-4 border-b border-stone-100 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-stone-950 mt-2" />
                    <div className="flex-1">
                      <p className="text-sm text-stone-900 font-medium">{activity.description}</p>
                      <p className="text-xs text-stone-500 mt-1">
                        {new Date(activity.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500">No recent activity</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl">
            <h2 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
              QUICK ACTIONS
            </h2>
            <div className="space-y-3">
              <Link
                href="/admin/academy"
                className="block w-full bg-stone-950 text-white hover:bg-stone-800 px-6 py-4 rounded-xl text-sm tracking-wider uppercase transition-colors"
              >
                CREATE NEW COURSE
              </Link>
              <Link
                href="/admin/agent"
                className="block w-full bg-stone-100 text-stone-950 hover:bg-stone-200 px-6 py-4 rounded-xl text-sm tracking-wider uppercase transition-colors"
              >
                START AGENT CHAT
              </Link>
              <Link
                href="/admin/feedback"
                className="block w-full bg-stone-100 text-stone-950 hover:bg-stone-200 px-6 py-4 rounded-xl text-sm tracking-wider uppercase transition-colors"
              >
                VIEW FEEDBACK
              </Link>
              <Link
                href="/"
                className="block w-full bg-stone-100 text-stone-950 hover:bg-stone-200 px-6 py-4 rounded-xl text-sm tracking-wider uppercase transition-colors"
              >
                VIEW USER APP
              </Link>
            </div>
          </div>
        </div>

        {/* Brand Showcase */}
        <div className="mt-12 bg-white rounded-[1.75rem] overflow-hidden border border-stone-200 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-12 flex flex-col justify-center">
              <h2 className="font-['Times_New_Roman'] text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-6">
                SSELFIE
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed mb-6">
                Your AI-powered personal branding platform. Empowering creators and entrepreneurs to build authentic,
                professional brands through intelligent content creation and strategic guidance.
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs text-stone-500">
                <div>
                  <p className="text-2xl font-['Times_New_Roman'] font-extralight text-stone-950">
                    {stats?.totalUsers || 0}
                  </p>
                  <p className="uppercase tracking-wider">Users</p>
                </div>
                <div>
                  <p className="text-2xl font-['Times_New_Roman'] font-extralight text-stone-950">
                    {stats?.totalCourses || 0}
                  </p>
                  <p className="uppercase tracking-wider">Courses</p>
                </div>
              </div>
            </div>
            <div className="relative h-64 md:h-auto">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/100-W8HXvEhCIG14XjVDUygpuBKAhlwZCj-XJOFSUZyedJgybWV1NgZqcSi2TrdAx.png"
                alt="SSELFIE Brand"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
