"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, TrendingUp, Users, BookOpen, MessageSquare, AlertCircle, DollarSign, Calendar, BarChart3, Coins, Mail, Star } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { SystemHealthMonitor } from "./system-health-monitor"
import { AdminNotifications } from "./admin-notifications"

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

interface FeedbackData {
  totalFeedback: number
  unreadCount: number
  bugReports: number
  featureRequests: number
  testimonials: number
  sharedSSELFIEs: number
  recentFeedback: Array<{
    id: string
    user_email: string
    type: string
    subject: string
    created_at: string
    status: string
  }>
}

interface AdminDashboardProps {
  userId: string
  userName: string
}

export function AdminDashboard({ userId, userName }: AdminDashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenue, setRevenue] = useState<RevenueData | null>(null)
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [revenueHistory, setRevenueHistory] = useState<any[]>([])
  const [pendingTestimonialsCount, setPendingTestimonialsCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
    fetchRevenueData()
    fetchFeedbackData()
    fetchRevenueHistory()
    fetchPendingTestimonialsCount()
    
    const refreshInterval = setInterval(() => {
      console.log("[v0] Auto-refreshing dashboard data...")
      fetchDashboardStats()
      fetchRevenueData()
      fetchFeedbackData()
      fetchRevenueHistory()
      fetchPendingTestimonialsCount()
    }, 30000) // 30 seconds
    
    return () => clearInterval(refreshInterval)
  }, [])

  const fetchDashboardStats = async () => {
    try {
      console.log("[v0] Fetching dashboard stats...")
      const response = await fetch("/api/admin/dashboard/stats")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Dashboard stats fetched:", data)
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

  const fetchFeedbackData = async () => {
    try {
      const response = await fetch("/api/admin/dashboard/feedback")
      if (response.ok) {
        const data = await response.json()
        setFeedback(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching feedback data:", error)
    }
  }

  const fetchRevenueHistory = async () => {
    try {
      const response = await fetch("/api/admin/dashboard/revenue-history")
      if (response.ok) {
        const data = await response.json()
        setRevenueHistory(data.history || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching revenue history:", error)
    }
  }

  const fetchPendingTestimonialsCount = async () => {
    try {
      const response = await fetch("/api/admin/dashboard/testimonials-count")
      if (response.ok) {
        const data = await response.json()
        setPendingTestimonialsCount(data.pendingCount || 0)
      }
    } catch (error) {
      console.error("[v0] Error fetching testimonials count:", error)
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
      <div className="relative h-[15vh] md:h-[20vh] overflow-hidden">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/641-Yz6RWOHjtemWaGCwY5XQjtSCZX9LFH-E1PumsSpivkzYUKjuWvP4QaDz2DjyF.png"
          alt="Admin workspace"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-stone-50/50 to-stone-50" />
        <div className="absolute top-4 right-6">
          <AdminNotifications />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-['Times_New_Roman'] text-4xl md:text-6xl font-extralight tracking-[0.4em] uppercase text-stone-950 mb-2">
              ADMIN
            </h1>
            <p className="text-xs tracking-[0.3em] uppercase font-light text-stone-600">Welcome back, {userName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 -mt-8 md:-mt-12 relative z-10">
        {/* Simple Login as User Button */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-xl mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-950 mb-1">Login as User</h2>
              <p className="text-sm text-stone-600">Access any user's account with admin password</p>
            </div>
            <a
              href="/admin/login-as-user"
              className="px-6 py-3 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium"
            >
              Login as User
            </a>
          </div>
        </div>


        {/* KPI cards in one row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-gradient-to-br from-stone-950 to-stone-800 rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-700 shadow-xl">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-white" />
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
            </div>
            <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-white mb-1">
              {formatCurrency(revenue?.totalRevenue || 0)}
            </p>
            <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-stone-300">Total Revenue</p>
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-xl">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <Calendar className="w-6 h-6 md:w-8 md:h-8 text-stone-950" />
              <span className="text-[10px] md:text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Active</span>
            </div>
            <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
              {formatCurrency(revenue?.mrr || 0)}
            </p>
            <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-stone-500">MRR</p>
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-xl">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-stone-950" />
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
            </div>
            <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
              {stats?.totalUsers || 0}
            </p>
            <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-stone-500">Total Users</p>
            <p className="text-[10px] md:text-xs text-stone-400 mt-1">{stats?.activeUsers || stats?.totalUsers || 0} active</p>
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-xl">
            <SystemHealthMonitor compact />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto md:grid md:w-full md:grid-cols-5 mb-6 md:mb-8 bg-white/80 backdrop-blur-xl rounded-2xl p-2 border border-stone-200 min-w-max md:min-w-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-stone-950 data-[state=active]:text-white whitespace-nowrap text-xs md:text-sm">
                <BarChart3 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="revenue" className="data-[state=active]:bg-stone-950 data-[state=active]:text-white whitespace-nowrap text-xs md:text-sm">
                <DollarSign className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Revenue
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-stone-950 data-[state=active]:text-white whitespace-nowrap text-xs md:text-sm">
                <Users className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="feedback" className="data-[state=active]:bg-stone-950 data-[state=active]:text-white whitespace-nowrap text-xs md:text-sm">
                <MessageSquare className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Feedback
              </TabsTrigger>
              <TabsTrigger value="conversions" className="data-[state=active]:bg-stone-950 data-[state=active]:text-white whitespace-nowrap text-xs md:text-sm">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Conversions
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 md:space-y-8">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
                <Users className="w-6 h-6 text-stone-500 mb-3" />
                <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
                  {stats?.totalUsers || 0}
                </p>
                <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-stone-500">Total Users</p>
                <p className="text-[10px] md:text-xs text-stone-400 mt-1">{stats?.activeUsers || 0} active</p>
              </div>

              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
                <BookOpen className="w-6 h-6 text-stone-500 mb-3" />
                <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
                  {stats?.totalCourses || 0}
                </p>
                <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-stone-500">Courses</p>
                <p className="text-[10px] md:text-xs text-stone-400 mt-1">{stats?.publishedCourses || 0} published</p>
              </div>

              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
                <MessageSquare className="w-6 h-6 text-stone-500 mb-3" />
                <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
                  {stats?.totalChats || 0}
                </p>
                <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-stone-500">AI Chats</p>
              </div>

              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
                <AlertCircle className="w-6 h-6 text-stone-500 mb-3" />
                <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
                  {feedback?.totalFeedback || 0}
                </p>
                <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-stone-500">Feedback</p>
                <p className="text-[10px] md:text-xs text-stone-400 mt-1">{feedback?.unreadCount || 0} new</p>
              </div>
            </div>

            {/* Main Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Link href="/admin/academy" className="group">
                <div className="bg-white rounded-xl md:rounded-2xl overflow-hidden border border-stone-200 shadow-lg hover:shadow-xl transition-all h-full">
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/618-TVCuZVG8V6R2Bput7pX8V06bCHRXGx-TD03ySws0dHTOBOHA3nEypKB2ryX8K.png"
                      alt="Academy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <h3 className="font-['Times_New_Roman'] text-2xl md:text-3xl font-extralight tracking-[0.3em] uppercase text-white">
                        ACADEMY
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 md:p-6">
                    <p className="text-sm md:text-base text-stone-600 leading-relaxed">
                      Manage courses and educational content
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/agent" className="group">
                <div className="bg-white rounded-xl md:rounded-2xl overflow-hidden border border-stone-200 shadow-lg hover:shadow-xl transition-all h-full">
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/maya_68de145ae1rme0cs07ja9mcp90_0_1756673402614%20%281%29-v0JUZYIdnHyMNS5iYx5wGACaoJUT3R.png"
                      alt="AI Agent"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <h3 className="font-['Times_New_Roman'] text-2xl md:text-3xl font-extralight tracking-[0.3em] uppercase text-white">
                        AGENT
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 md:p-6">
                    <p className="text-sm md:text-base text-stone-600 leading-relaxed">
                      AI-powered content creation and strategy
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/email-broadcast" className="group">
                <div className="bg-white rounded-xl md:rounded-2xl overflow-hidden border border-stone-200 shadow-lg hover:shadow-xl transition-all h-full">
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
                    <Mail className="w-20 h-20 text-stone-300" strokeWidth={1.5} />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <h3 className="font-['Times_New_Roman'] text-2xl md:text-3xl font-extralight tracking-[0.3em] uppercase text-white">
                        EMAILS
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 md:p-6">
                    <p className="text-sm md:text-base text-stone-600 leading-relaxed">
                      Send email campaigns and testimonial requests
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/credits" className="group">
                <div className="bg-white rounded-xl md:rounded-2xl overflow-hidden border border-stone-200 shadow-lg hover:shadow-xl transition-all h-full">
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                    <Coins className="w-20 h-20 text-amber-600/30" strokeWidth={1.5} />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <h3 className="font-['Times_New_Roman'] text-2xl md:text-3xl font-extralight tracking-[0.3em] uppercase text-white">
                        CREDITS
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 md:p-6">
                    <p className="text-sm md:text-base text-stone-600 leading-relaxed">
                      Add credits to user accounts
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/feedback" className="group">
                <div className="bg-white rounded-xl md:rounded-2xl overflow-hidden border border-stone-200 shadow-lg hover:shadow-xl transition-all h-full">
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/616-nnePryg0hS2y745w8ZNU8TWvFrgude-Q2S6CSY6Sa2K2cy4vxgEMi0zyBBBIE.png"
                      alt="Feedback"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <h3 className="font-['Times_New_Roman'] text-2xl md:text-3xl font-extralight tracking-[0.3em] uppercase text-white">
                        FEEDBACK
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 md:p-6">
                    <p className="text-sm md:text-base text-stone-600 leading-relaxed">
                      View user feedback and testimonials
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/testimonials" className="group relative">
                <div className="bg-white rounded-xl md:rounded-2xl overflow-hidden border border-stone-200 shadow-lg hover:shadow-xl transition-all h-full">
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
                    <Star className="w-20 h-20 text-stone-300" strokeWidth={1.5} />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <h3 className="font-['Times_New_Roman'] text-2xl md:text-3xl font-extralight tracking-[0.3em] uppercase text-white">
                        REVIEWS
                      </h3>
                    </div>
                    {pendingTestimonialsCount > 0 && (
                      <div className="absolute top-3 right-3 bg-stone-950 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-medium shadow-lg">
                        {pendingTestimonialsCount}
                      </div>
                    )}
                  </div>
                  <div className="p-4 md:p-6">
                    <p className="text-sm md:text-base text-stone-600 leading-relaxed">
                      Approve and publish customer testimonials
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-8 border border-stone-200 shadow-lg">
              <h2 className="font-['Times_New_Roman'] text-lg md:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
                RECENT ACTIVITY
              </h2>
              <div className="space-y-3">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 md:gap-4 pb-3 md:pb-4 border-b border-stone-100 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-stone-950 mt-2 md:mt-3" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 md:mb-2">
                          <span className="text-[10px] md:text-sm tracking-wider uppercase text-stone-400 bg-stone-200 px-2 py-1 rounded">
                            {activity.type}
                          </span>
                        </div>
                        <p className="text-sm md:text-base text-stone-900 font-medium mb-1 md:mb-2">{activity.description}</p>
                        <p className="text-xs md:text-sm text-stone-500">
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
                  <p className="text-sm md:text-base text-stone-500 text-center py-8 md:py-12">No recent activity</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6 md:space-y-8">
            {/* Revenue Chart */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-8 border border-stone-200 shadow-lg">
              <h2 className="font-['Times_New_Roman'] text-lg md:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
                REVENUE TREND
              </h2>
              {revenueHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                  <AreaChart data={revenueHistory}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1c1917" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1c1917" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="date" stroke="#78716c" style={{ fontSize: "12px" }} />
                    <YAxis stroke="#78716c" style={{ fontSize: "12px" }} tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e7e5e4", borderRadius: "8px" }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#1c1917" fillOpacity={1} fill="url(#revenueGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm md:text-base text-stone-500 text-center py-8 md:py-12">No revenue history available</p>
              )}
            </div>

            {/* Revenue Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
                <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
                  {formatCurrency(revenue?.totalRevenue || 0)}
                </p>
                <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-stone-500">Total Revenue</p>
                <p className="text-[10px] md:text-xs text-stone-400 mt-1">All time earnings</p>
              </div>

              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
                <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
                  {formatCurrency(revenue?.mrr || 0)}
                </p>
                <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-stone-500">Monthly Recurring</p>
                <p className="text-[10px] md:text-xs text-stone-400 mt-1">Active subscriptions</p>
              </div>

              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
                <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
                  {formatCurrency(revenue?.oneTimeRevenue || 0)}
                </p>
                <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-stone-500">One-Time Sales</p>
                <p className="text-[10px] md:text-xs text-stone-400 mt-1">Last 30 days</p>
              </div>
            </div>

            {/* Subscription Breakdown */}
            {revenue && revenue.subscriptionBreakdown.length > 0 && (
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-8 border border-stone-200 shadow-lg">
                <p className="text-xs md:text-sm tracking-[0.2em] uppercase text-stone-500 mb-4 md:mb-6">Subscription Breakdown</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {revenue.subscriptionBreakdown.map((sub) => (
                    <div key={sub.tier} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                      <div>
                        <p className="text-[10px] md:text-sm tracking-wider uppercase text-stone-400">{sub.tier}</p>
                        <p className="text-sm md:text-base text-stone-900">{sub.count} subscribers</p>
                      </div>
                      <p className="text-lg md:text-2xl font-['Times_New_Roman'] font-extralight text-stone-950">
                        {formatCurrency(sub.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-8 border border-stone-200 shadow-lg">
                <h3 className="font-['Times_New_Roman'] text-lg md:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
                  USER STATISTICS
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-b border-stone-100">
                    <span className="text-sm md:text-base text-stone-600">Total Users</span>
                    <span className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950">
                      {stats?.totalUsers || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-stone-100">
                    <span className="text-sm md:text-base text-stone-600">Active This Month</span>
                    <span className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950">
                      {stats?.activeUsers || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm md:text-base text-stone-600">Total Chats</span>
                    <span className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950">
                      {stats?.totalChats || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-8 border border-stone-200 shadow-lg">
                <h3 className="font-['Times_New_Roman'] text-lg md:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
                  CONTENT STATISTICS
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-b border-stone-100">
                    <span className="text-sm md:text-base text-stone-600">Total Courses</span>
                    <span className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950">
                      {stats?.totalCourses || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-stone-100">
                    <span className="text-sm md:text-base text-stone-600">Published Courses</span>
                    <span className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950">
                      {stats?.publishedCourses || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm md:text-base text-stone-600">Total Lessons</span>
                    <span className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950">
                      {stats?.totalLessons || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Conversions Tab */}
          <TabsContent value="conversions" className="space-y-6 md:space-y-8">
            <div className="bg-white rounded-xl md:rounded-2xl p-6 md:p-8 border border-stone-200 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl md:text-2xl font-['Times_New_Roman'] font-light text-stone-950">
                  Conversion Dashboard
                </h2>
                <Link
                  href="/admin/conversions"
                  className="px-4 py-2 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  View Full Dashboard
                </Link>
              </div>
              <p className="text-stone-600 mb-6">
                Comprehensive conversion funnel metrics, campaign performance, and revenue analytics.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-stone-50 rounded-lg">
                  <div className="text-sm text-stone-600 mb-1">Email → Purchase</div>
                  <div className="text-2xl font-serif font-light text-stone-950">Funnel Metrics</div>
                </div>
                <div className="p-4 bg-stone-50 rounded-lg">
                  <div className="text-sm text-stone-600 mb-1">Top Campaigns</div>
                  <div className="text-2xl font-serif font-light text-stone-950">Performance</div>
                </div>
                <div className="p-4 bg-stone-50 rounded-lg">
                  <div className="text-sm text-stone-600 mb-1">Weekly Stats</div>
                  <div className="text-2xl font-serif font-light text-stone-950">Revenue & Growth</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6 md:space-y-8">
            {/* Feedback Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
                <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
                  {feedback?.bugReports || 0}
                </p>
                <p className="text-[10px] md:text-sm tracking-wider uppercase text-stone-500">Bug Reports</p>
              </div>
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
                <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
                  {feedback?.featureRequests || 0}
                </p>
                <p className="text-[10px] md:text-sm tracking-wider uppercase text-stone-500">Feature Requests</p>
              </div>
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
                <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
                  {feedback?.testimonials || 0}
                </p>
                <p className="text-[10px] md:text-sm tracking-wider uppercase text-stone-500">Testimonials</p>
              </div>
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
                <p className="text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
                  {feedback?.sharedSSELFIEs || 0}
                </p>
                <p className="text-[10px] md:text-sm tracking-wider uppercase text-stone-500">Shared SSELFIEs</p>
              </div>
            </div>

            {/* Recent Feedback */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-8 border border-stone-200 shadow-lg">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="font-['Times_New_Roman'] text-lg md:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                  RECENT FEEDBACK
                </h2>
                <Link
                  href="/admin/feedback"
                  className="text-[10px] md:text-sm tracking-[0.2em] uppercase text-stone-600 hover:text-stone-950 transition-colors"
                >
                  View All →
                </Link>
              </div>

              <div className="space-y-3">
                {feedback?.recentFeedback && feedback.recentFeedback.length > 0 ? (
                  feedback.recentFeedback.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      href="/admin/feedback"
                      className="flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-100 transition-colors group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 md:mb-2">
                          <span className="text-[10px] md:text-sm tracking-wider uppercase text-stone-400 bg-stone-200 px-2 py-1 rounded">
                            {item.type}
                          </span>
                          {item.status === "new" && <span className="w-2 h-2 rounded-full bg-stone-950" />}
                        </div>
                        <p className="text-sm md:text-base text-stone-900 font-medium mb-1 md:mb-2">{item.subject}</p>
                        <p className="text-xs md:text-sm text-stone-500">{item.user_email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs md:text-sm text-stone-400">
                          {new Date(item.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm md:text-base text-stone-500 text-center py-8 md:py-12">No feedback yet</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
