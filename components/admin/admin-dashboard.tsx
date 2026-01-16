'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminNav } from './admin-nav'
import { AlexSuggestionCard, AlexSuggestion } from './alex-suggestion-card'
import { AdminMetricCard, AdminLoadingState } from './shared'
import { formatCurrency, formatAdminDate } from '@/lib/admin/format-utils'
import { Users, DollarSign, TrendingUp, Percent } from 'lucide-react'

interface DashboardStats {
  totalUsers: number
  activeSubscriptions: number
  mrr: number
  totalRevenue: number
  conversionRate: number
  stripeLive?: {
    activeSubscriptions: number
    totalSubscriptions: number
    canceledSubscriptions30d: number
    totalRevenue: number
    mrr: number
    oneTimeRevenue: number
    creditPurchaseRevenue: number
    newSubscribers30d: number
    newOneTimeBuyers30d: number
    timestamp: string
    cached: boolean
  } | null
  dbValues?: {
    mrr: number
    activeSubscriptions: number
    totalRevenue: number
  }
}

interface MissionControlTask {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  cursorPrompt?: string
  actionType: 'cursor' | 'alex' | 'manual'
  completed: boolean
}

interface AdminError {
  toolName: string
  count: number
  lastSeen: string
  recentErrors: Array<{
    id: number
    error_message: string
    created_at: string
  }>
}

interface CronJob {
  jobName: string
  schedule: string
  path: string
  lastRun: {
    status: string
    startedAt: string
    finishedAt: string | null
    durationMs: number | null
    summary: Record<string, any>
  } | null
  runCount24h: number
  lastError: {
    message: string
    createdAt: string
  } | null
}

export function AdminDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [todaysPriorities, setTodaysPriorities] = useState<MissionControlTask[]>([])
  const [suggestions, setSuggestions] = useState<AlexSuggestion[]>([])
  const [adminErrors, setAdminErrors] = useState<AdminError[]>([])
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchDashboardData()
    fetchTodaysPriorities()
    fetchSuggestions()
    fetchAdminErrors()
    fetchCronStatus()
  }, [])
  
  const fetchSuggestions = async () => {
    try {
      const response = await fetch('/api/admin/alex/suggestions')
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    }
  }
  
  const handleDismissSuggestion = async (suggestionId: number) => {
    try {
      const response = await fetch('/api/admin/alex/suggestions/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId })
      })
      
      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      }
    } catch (error) {
      console.error('Error dismissing suggestion:', error)
      throw error
    }
  }

  const handleActUponSuggestion = async (suggestionId: number) => {
    try {
      const response = await fetch('/api/admin/alex/suggestions/act-upon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId })
      })
      
      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      }
    } catch (error) {
      console.error('Error marking suggestion acted upon:', error)
      throw error
    }
  }

  const handleSuggestionAction = (suggestion: AlexSuggestion) => {
    // Navigate to Alex chat with the action as context
    if (suggestion.action) {
      window.location.href = `/admin/alex?action=${encodeURIComponent(suggestion.action)}`
    } else {
      window.location.href = '/admin/alex'
    }
  }
  
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchTodaysPriorities = async () => {
    try {
      const response = await fetch('/api/admin/mission-control/daily-check', {
        method: 'POST'
      })
      const data = await response.json()
      
      // Extract high priority tasks from all agents
      const highPriorityTasks: MissionControlTask[] = []
      if (data.checks && Array.isArray(data.checks)) {
        data.checks.forEach((check: any) => {
          if (check.issues && Array.isArray(check.issues)) {
            check.issues
              .filter((issue: any) => issue.priority === 'high' && !issue.completed)
              .forEach((issue: any) => {
                highPriorityTasks.push({
                  priority: issue.priority,
                  title: issue.title,
                  description: issue.description || issue.cursorPrompt || '',
                  cursorPrompt: issue.cursorPrompt,
                  actionType: issue.actionType || 'manual',
                  completed: issue.completed || false
                })
              })
          }
        })
      }
      
      setTodaysPriorities(highPriorityTasks.slice(0, 3)) // Top 3
    } catch (error) {
      console.error('Error fetching priorities:', error)
    }
  }
  
  const fetchAdminErrors = async () => {
    try {
      const response = await fetch('/api/admin/diagnostics/errors?since=24&limit=5')
      const data = await response.json()
      if (data.success && data.tools) {
        setAdminErrors(data.tools)
      }
    } catch (error) {
      console.error('Error fetching admin errors:', error)
    }
  }
  
  const fetchCronStatus = async () => {
    try {
      const response = await fetch('/api/admin/diagnostics/cron-status?since=24')
      const data = await response.json()
      if (data.success && data.jobs) {
        setCronJobs(data.jobs)
      }
    } catch (error) {
      console.error('Error fetching cron status:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <AdminLoadingState message="Loading dashboard..." fullScreen={false} />
      </div>
    )
  }
  const uniquePriorities = todaysPriorities.filter(
    (task, index, array) => array.findIndex((item) => item.title === task.title && item.description === task.description) === index,
  )
  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        {/* Hero Section - Revenue Metrics */}
        <div className="mb-12 sm:mb-16">
          <h1 className="font-['Times_New_Roman'] text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-3 sm:mb-4">
            REVENUE OVERVIEW
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 tracking-[0.1em] uppercase mb-8 sm:mb-12">
            {formatAdminDate(new Date(), 'full')}
          </p>
          
          {/* Key Metrics - 4 Column Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
            <AdminMetricCard
              label="Monthly Recurring Revenue"
              value={formatCurrency(stats?.stripeLive?.mrr || stats?.mrr || 0)}
              icon={<DollarSign className="w-5 h-5" />}
              variant="primary"
              subtitle={stats?.stripeLive ? 'Live from Stripe' : 'Estimated from DB'}
            />
            
            <AdminMetricCard
              label="Active Subscriptions"
              value={stats?.stripeLive?.activeSubscriptions || stats?.activeSubscriptions || 0}
              icon={<Users className="w-5 h-5" />}
            />
            
            <AdminMetricCard
              label="Total Users"
              value={stats?.totalUsers || 0}
              icon={<Users className="w-5 h-5" />}
            />
            
            <AdminMetricCard
              label="Conversion Rate"
              value={`${stats?.conversionRate || 0}%`}
              icon={<Percent className="w-5 h-5" />}
            />
          </div>

          {/* Growth Dashboard Link */}
          <div className="mb-8 sm:mb-12">
            <Link
              href="/admin/growth-dashboard"
              className="block bg-white border border-stone-200 p-4 sm:p-6 rounded-none hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-['Times_New_Roman'] text-stone-950 mb-1 tracking-[0.1em] uppercase">
                    Growth Dashboard
                  </h3>
                  <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase">
                    Revenue, credit costs, referral ROI, and gross margin metrics
                  </p>
                </div>
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-stone-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Additional Stripe Metrics */}
          {stats?.stripeLive && (
            <div className="mb-8 sm:mb-12">
              <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 mb-4 sm:mb-6 tracking-[0.1em] uppercase">
                Revenue Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1 sm:mb-2">
                    ${(stats.stripeLive.oneTimeRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-400">
                    One-Time Revenue
                  </p>
                </div>
                
                <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1 sm:mb-2">
                    {stats.stripeLive.newSubscribers30d || 0}
                  </p>
                  <p className="text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-400">
                    New Subscribers (30d)
                  </p>
                </div>
                
                <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1 sm:mb-2">
                    ${(stats.stripeLive.totalRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-400">
                    Total Revenue (All Time)
                  </p>
                </div>
              </div>
              
              {/* Second Row: Credit Purchases, Total Subscriptions, Canceled */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1 sm:mb-2">
                    ${(stats.stripeLive.creditPurchaseRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-400">
                    Credit Purchases
                  </p>
                </div>
                
                <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1 sm:mb-2">
                    {stats.stripeLive.totalSubscriptions || 0}
                  </p>
                  <p className="text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-400">
                    Total Subscriptions
                  </p>
                </div>
                
                <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1 sm:mb-2">
                    {stats.stripeLive.canceledSubscriptions30d || 0}
                  </p>
                  <p className="text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-400">
                    Canceled (30d)
                  </p>
                </div>
              </div>
              
              {/* New One-Time Buyers - Smaller Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-stone-50 border border-stone-200 p-3 sm:p-4 rounded-none">
                  <p className="text-lg sm:text-xl lg:text-2xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1">
                    {stats.stripeLive.newOneTimeBuyers30d || 0}
                  </p>
                  <p className="text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-500">
                    New One-Time Buyers (30d)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Today's Focus Section */}
        <div className="mb-12 sm:mb-16">
          <h2 className="font-['Times_New_Roman'] text-2xl sm:text-3xl lg:text-4xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-3 sm:mb-4">
            TODAY&apos;S FOCUS
          </h2>
          
          {/* Today's Priorities */}
          {uniquePriorities.length > 0 ? (
            <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-12">
              {uniquePriorities.map((task, idx) => (
                <div 
                  key={idx}
                  className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none group hover:border-stone-400 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          task.priority === 'high' ? 'bg-stone-950' : 'bg-stone-400'
                        }`} />
                        <p className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-400">
                          Priority {idx + 1}
                        </p>
                      </div>
                      <h3 className="text-sm sm:text-base font-['Times_New_Roman'] text-stone-950 mb-2">
                        {task.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-600 mb-3 sm:mb-4">
                        {task.description}
                      </p>
                      <Link
                        href={task.actionType === 'alex' ? '/admin/alex' : '/admin/mission-control'}
                        className="inline-block text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 hover:text-stone-600 transition-colors border-b border-stone-950 pb-1"
                      >
                        {task.actionType === 'alex' ? 'Ask Alex' : 
                         task.actionType === 'cursor' ? 'View Fix' : 'Take Action'}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-stone-200 p-8 sm:p-12 text-center rounded-none mb-8 sm:mb-12">
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-400 mb-2">
                All Clear
              </p>
              <p className="text-[10px] sm:text-xs text-stone-500">
                No high priority tasks today
              </p>
            </div>
          )}

          {/* Proactive Email Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-8 sm:mt-12 mb-8 sm:mb-12">
              <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 mb-4 sm:mb-6 tracking-[0.1em] uppercase">
                Email Opportunities
              </h2>
              <div className="space-y-4">
                {suggestions.map((suggestion) => (
                  <AlexSuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onDismiss={handleDismissSuggestion}
                    onActUpon={handleActUponSuggestion}
                    onActionClick={handleSuggestionAction}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Cron & Email Status (24h) */}
          {cronJobs.length > 0 && (
            <div className="mt-8 sm:mt-12 mb-8 sm:mb-12">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
                  Cron & Email Status (24h)
                </h2>
                <Link
                  href="/admin/diagnostics/cron"
                  className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-600 hover:text-stone-950 transition-colors"
                >
                  View Details →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {cronJobs.slice(0, 6).map((job) => (
                  <div
                    key={job.jobName}
                    className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {job.lastRun?.status === 'ok' ? (
                          <span className="text-green-600">✅</span>
                        ) : job.lastRun?.status === 'failed' ? (
                          <span className="text-red-600">❌</span>
                        ) : (
                          <span className="text-stone-400">⏸</span>
                        )}
                        <p className="text-xs sm:text-sm font-medium text-stone-950 truncate">
                          {job.jobName.replace(/-/g, ' ')}
                        </p>
                      </div>
                      <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 flex-shrink-0">
                        {job.runCount24h}
                      </span>
                    </div>
                    {job.lastRun && (
                      <p className="text-xs text-stone-600 mb-1">
                        Last: {new Date(job.lastRun.startedAt).toLocaleTimeString()}
                      </p>
                    )}
                    {job.lastError && (
                      <p className="text-xs text-red-600 truncate mb-1">
                        {job.lastError.message}
                      </p>
                    )}
                    {job.lastRun?.summary && Object.keys(job.lastRun.summary).length > 0 && (
                      <p className="text-[10px] text-stone-400">
                        {job.lastRun.summary.campaignsProcessed && `${job.lastRun.summary.campaignsProcessed} campaigns`}
                        {job.lastRun.summary.emailsSent && ` • ${job.lastRun.summary.emailsSent} sent`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recent Admin Errors (24h) */}
          {adminErrors.length > 0 && (
            <div className="mt-8 sm:mt-12 mb-8 sm:mb-12">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
                  Recent Admin Errors (24h)
                </h2>
                <Link
                  href="/admin/diagnostics/errors"
                  className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-600 hover:text-stone-950 transition-colors"
                >
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {adminErrors.slice(0, 3).map((error) => (
                  <div
                    key={error.toolName}
                    className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs sm:text-sm font-medium text-stone-950 truncate">
                        {error.toolName}
                      </p>
                      <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 flex-shrink-0">
                        {error.count}
                      </span>
                    </div>
                    {error.recentErrors.length > 0 && (
                      <p className="text-xs text-stone-600 truncate mb-2">
                        {error.recentErrors[0].error_message}
                      </p>
                    )}
                    <p className="text-[10px] text-stone-400">
                      {new Date(error.lastSeen).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Quick Access - Pinterest Grid */}
        <div className="mb-12 sm:mb-16">
          <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-6 sm:mb-8">
            QUICK ACCESS
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Alex */}
            <Link href="/admin/alex" className="group" aria-label="Go to Alex AI marketing partner">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/friendly-ai-assistant-avatar-maya.jpg"
                  alt="Alex AI marketing partner assistant interface"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    e.currentTarget.src = '/minimalist-desk-setup-with-pendant-light-neutral-a.jpg'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
                  <h3 className="font-['Times_New_Roman'] text-xl sm:text-2xl lg:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-white mb-1 sm:mb-2">
                    ALEX
                  </h3>
                  <p className="text-[10px] sm:text-xs text-white/80 tracking-wide">
                    Your AI marketing partner
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Mission Control */}
            <Link href="/admin/mission-control" className="group" aria-label="Go to Mission Control dashboard">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/minimalist-desk-setup-with-pendant-light-neutral-a.jpg"
                  alt="Mission Control AI team intelligence dashboard"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    e.currentTarget.src = '/minimalist-phone-with-instagram-aesthetic-white-ba.jpg'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
                  <h3 className="font-['Times_New_Roman'] text-xl sm:text-2xl lg:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-white mb-1 sm:mb-2">
                    MISSION CONTROL
                  </h3>
                  <p className="text-[10px] sm:text-xs text-white/80 tracking-wide">
                    AI team intelligence
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Weekly Journal */}
            <Link href="/admin/journal" className="group" aria-label="Go to Weekly Journal">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/black-productivity-planner-with-iced-coffee-minima.jpg"
                  alt="Weekly Journal for updates and business stories"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    e.currentTarget.src = '/minimalist-desk-setup-with-pendant-light-neutral-a.jpg'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
                  <h3 className="font-['Times_New_Roman'] text-xl sm:text-2xl lg:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-white mb-1 sm:mb-2">
                    JOURNAL
                  </h3>
                  <p className="text-[10px] sm:text-xs text-white/80 tracking-wide">
                    Weekly updates & stories
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Maya Studio */}
            <Link href="/admin/maya-studio" className="group" aria-label="Go to Maya Studio">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/minimalist-phone-with-instagram-aesthetic-white-ba.jpg"
                  alt="Maya Studio for creating professional brand photos"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    e.currentTarget.src = '/minimalist-desk-setup-with-pendant-light-neutral-a.jpg'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
                  <h3 className="font-['Times_New_Roman'] text-xl sm:text-2xl lg:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-white mb-1 sm:mb-2">
                    MAYA STUDIO
                  </h3>
                  <p className="text-[10px] sm:text-xs text-white/80 tracking-wide">
                    Create brand photos
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Credits */}
            <Link href="/admin/credits" className="group" aria-label="Go to Credits Manager">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/images/641-yz6rwohjtemwagcwy5xqjtsczx9lfh.png"
                  alt="Credits management system for user credits"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    e.currentTarget.src = '/minimalist-desk-setup-with-pendant-light-neutral-a.jpg'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
                  <h3 className="font-['Times_New_Roman'] text-xl sm:text-2xl lg:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-white mb-1 sm:mb-2">
                    CREDITS
                  </h3>
                  <p className="text-[10px] sm:text-xs text-white/80 tracking-wide">
                    Manage user credits
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Analytics */}
            <Link href="/admin/conversions" className="group" aria-label="Go to Analytics Dashboard">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/minimalist-desk-setup-with-pendant-light-neutral-a.jpg"
                  alt="Analytics dashboard showing revenue and conversion metrics"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    e.currentTarget.src = '/black-productivity-planner-with-iced-coffee-minima.jpg'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
                  <h3 className="font-['Times_New_Roman'] text-xl sm:text-2xl lg:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-white mb-1 sm:mb-2">
                    ANALYTICS
                  </h3>
                  <p className="text-[10px] sm:text-xs text-white/80 tracking-wide">
                    Revenue & metrics
                  </p>
                </div>
              </div>
            </Link>
            
          </div>
        </div>
        
        {/* Secondary Tools */}
        <div className="border-t border-stone-200 pt-8 sm:pt-12">
          <h2 className="font-['Times_New_Roman'] text-lg sm:text-xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-6 sm:mb-8">
            TOOLS
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link 
              href="/admin/testimonials"
              className="bg-white border border-stone-200 p-4 sm:p-6 hover:border-stone-400 transition-all rounded-none min-h-[100px] sm:min-h-[120px] flex flex-col justify-between touch-manipulation"
              aria-label="Go to Testimonials manager"
            >
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 mb-1">
                Testimonials
              </p>
              <p className="text-[10px] sm:text-xs text-stone-400">
                Manage reviews
              </p>
            </Link>
            
            <Link 
              href="/admin/feedback"
              className="bg-white border border-stone-200 p-4 sm:p-6 hover:border-stone-400 transition-all rounded-none min-h-[100px] sm:min-h-[120px] flex flex-col justify-between touch-manipulation"
              aria-label="Go to Feedback manager"
            >
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 mb-1">
                Feedback
              </p>
              <p className="text-[10px] sm:text-xs text-stone-400">
                User feedback & bugs
              </p>
            </Link>
            
            <Link 
              href="/admin/login-as-user"
              className="bg-white border border-stone-200 p-4 sm:p-6 hover:border-stone-400 transition-all rounded-none min-h-[100px] sm:min-h-[120px] flex flex-col justify-between touch-manipulation"
              aria-label="Go to Login As User tool"
            >
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 mb-1">
                Login As User
              </p>
              <p className="text-[10px] sm:text-xs text-stone-400">
                Access accounts
              </p>
            </Link>
            
            <Link 
              href="/admin/maya-testing"
              className="bg-white border border-stone-200 p-4 sm:p-6 hover:border-stone-400 transition-all rounded-none min-h-[100px] sm:min-h-[120px] flex flex-col justify-between touch-manipulation"
              aria-label="Go to Maya Testing tool"
            >
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 mb-1">
                Maya Testing
              </p>
              <p className="text-[10px] sm:text-xs text-stone-400">
                Test parameters
              </p>
            </Link>
            
            <Link 
              href="/admin/prompt-guides"
              className="bg-white border border-stone-200 p-4 sm:p-6 hover:border-stone-400 transition-all rounded-none min-h-[100px] sm:min-h-[120px] flex flex-col justify-between touch-manipulation"
              aria-label="Go to Prompt Guides manager"
            >
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 mb-1">
                Prompt Guides
              </p>
              <p className="text-[10px] sm:text-xs text-stone-400">
                View, publish, and manage all prompt guides
              </p>
            </Link>
            
            <Link 
              href="/admin/email-control"
              className="bg-white border border-stone-200 p-4 sm:p-6 hover:border-stone-400 transition-all rounded-none min-h-[100px] sm:min-h-[120px] flex flex-col justify-between touch-manipulation"
              aria-label="Go to Email Control panel"
            >
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 mb-1">
                Email Control
              </p>
              <p className="text-[10px] sm:text-xs text-stone-400">
                Control email sending & test safely
              </p>
            </Link>
          </div>
        </div>
        
      </div>
    </div>
  )
}

